#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const win = process.platform === "win32";

function log(message) {
  console.log(`[dev] ${message}`);
}

async function viteReady() {
  try {
    const response = await fetch("http://127.0.0.1:5173/@vite/client", { cache: "no-store" });
    const type = response.headers.get("content-type") ?? "";
    return response.ok && !/html/i.test(type);
  } catch {
    return false;
  }
}

async function apiHealthy() {
  try {
    const response = await fetch("http://127.0.0.1:8888/api/dj/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body.ok === true && body.db === true;
  } catch {
    return false;
  }
}

function parseConnectPayload(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(stdout.slice(start, end + 1));
  } catch {
    return {};
  }
}

function localDatabaseEnv() {
  const result = spawnSync("npx", ["netlify", "database", "connect", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: win,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || !result.stdout?.trim()) return {};
  const payload = parseConnectPayload(result.stdout);
  const url = payload.connection_string?.trim() ?? "";
  if (!url) return {};
  return {
    NETLIFY_DB_URL: url,
    NETLIFY_DB_DRIVER: "server",
  };
}

const bootstrap = spawnSync(process.execPath, ["scripts/bootstrap.mjs", "--migrate", "--skip-env-copy"], {
  cwd: ROOT,
  stdio: "inherit",
});
if ((bootstrap.status ?? 1) !== 0) {
  process.exit(bootstrap.status ?? 1);
}

if (await apiHealthy()) {
  log("API já responde em http://localhost:8888 — cadastro DJ pode gravar.");
  await new Promise(() => {
    /* keep npm run dev attached */
  });
}

const dbEnv = localDatabaseEnv();
if (dbEnv.NETLIFY_DB_URL) {
  log("banco local pronto para as functions");
} else {
  log("aviso: sem connection string do Netlify Database — rode npm run db:repair se o cadastro falhar");
}

const command = (await viteReady())
  ? 'npx netlify dev --no-open --target-port=5173 --command="node scripts/keep-alive.mjs"'
  : "npx netlify dev --no-open";

if (command.includes("keep-alive")) {
  log("Vite já está em 5173 — subindo só a API em http://localhost:8888");
} else {
  log("subindo Vite + API (http://localhost:8888)");
}

const child = spawn(command, {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...dbEnv },
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
child.on("exit", (code) => {
  process.exit(code ?? 0);
});
