#!/usr/bin/env node
/**
 * Bootstrap automático do ambiente Mamute DJPLAYER.
 * Uso: node scripts/bootstrap.mjs [--migrate] [--wait-api]
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check-only");
const shouldMigrate = args.has("--migrate") && !checkOnly;
const waitApi = args.has("--wait-api");

function log(step, message) {
  console.log(`[bootstrap] ${step}: ${message}`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  return result.status === 0;
}

function ensureEnvFile() {
  const envPath = join(root, ".env");
  const examplePath = join(root, ".env.example");
  if (existsSync(envPath)) {
    log("env", ".env já existe");
    return true;
  }
  if (!existsSync(examplePath)) {
    log("env", "AVISO — .env.example não encontrado");
    return false;
  }
  copyFileSync(examplePath, envPath);
  log("env", "criado .env a partir de .env.example");
  return true;
}

function readResendConfigured() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return false;
  const content = readFileSync(envPath, "utf8");
  const match = content.match(/^RESEND_API_KEY=(.+)$/m);
  if (!match) return false;
  const value = match[1].trim();
  return Boolean(value && !value.includes("xxxxxxxx"));
}

async function waitForHealth(timeoutMs = 120_000) {
  const started = Date.now();
  const url = "http://127.0.0.1:8888/api/dj/health";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      if (response.ok) {
        const body = await response.json();
        if (body?.ok) {
          log("api", `pronta (${url})`);
          return true;
        }
      }
    } catch {
      // servidor ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  log("api", `timeout aguardando ${url} — inicie com npm run dev`);
  return false;
}

function main() {
  log("start", checkOnly ? "verificação" : "configuração automática");

  if (!checkOnly && !args.has("--skip-env-copy")) {
    ensureEnvFile();
  }

  const resendOk = readResendConfigured();
  if (resendOk) {
    log("email", "RESEND_API_KEY configurada — envio real de e-mail ativo");
  } else {
    log(
      "email",
      "sem RESEND_API_KEY — códigos aparecem na UI (devCode) e em .dev/mail/latest.json",
    );
  }

  if (shouldMigrate && !checkOnly) {
    log("db", "aplicando migrações…");
    const ok = run("npx", ["netlify", "database", "migrations", "apply"]);
    if (!ok) {
      log("db", "falha nas migrações — confira Netlify Database (netlify init + painel)");
      process.exitCode = 1;
      return;
    }
    log("db", "migrações aplicadas");
  }

  if (waitApi) {
    return waitForHealth().then((ok) => {
      if (!ok) process.exitCode = 1;
    });
  }

  log("done", "ambiente pronto — use npm run dev e http://localhost:8888");
  return undefined;
}

const result = main();
if (result instanceof Promise) {
  result.catch((error) => {
    console.error("[bootstrap] erro:", error);
    process.exitCode = 1;
  });
}
