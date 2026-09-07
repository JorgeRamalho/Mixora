#!/usr/bin/env node
/**
 * Configura RESEND_API_KEY no .env local e no Netlify, faz deploy e valida envio.
 *
 * Uso:
 *   node scripts/configure-resend.mjs re_SuaChaveAqui
 *   RESEND_API_KEY=re_xxx node scripts/configure-resend.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const siteUrl = "https://mamute-djplayer.netlify.app";
const testEmail = process.env.MAMUTE_TEST_EMAIL?.trim() || "jorgeramalho.ti@gmail.com";

function log(step, message) {
  console.log(`[resend-setup] ${step}: ${message}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  return result.status === 0;
}

function resolveApiKey() {
  const fromArg = process.argv.slice(2).find((part) => part.startsWith("re_"));
  const fromEnv = process.env.RESEND_API_KEY?.trim();
  const key = fromArg || fromEnv || "";
  if (!key || key.includes("xxxx")) {
    return null;
  }
  if (!/^re_[A-Za-z0-9_]+$/.test(key)) {
    throw new Error("Formato inválido de RESEND_API_KEY (esperado re_...).");
  }
  return key;
}

function upsertEnvFile(apiKey) {
  const envPath = join(root, ".env");
  const examplePath = join(root, ".env.example");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : readFileSync(examplePath, "utf8");

  if (/^RESEND_API_KEY=/m.test(content)) {
    content = content.replace(/^RESEND_API_KEY=.*$/m, `RESEND_API_KEY=${apiKey}`);
  } else if (/^#\s*RESEND_API_KEY=/m.test(content)) {
    content = content.replace(/^#\s*RESEND_API_KEY=.*$/m, `RESEND_API_KEY=${apiKey}`);
  } else {
    content += `\nRESEND_API_KEY=${apiKey}\n`;
  }

  if (!/^SITE_URL=/m.test(content)) {
    content += `SITE_URL=${siteUrl}\n`;
  }
  if (!/^EMAIL_FROM=/m.test(content)) {
    content += `EMAIL_FROM=Mamute DJPLAYER <onboarding@resend.dev>\n`;
  }

  writeFileSync(envPath, content, "utf8");
  log("env", "atualizado .env local");
}

async function validateResendKey(apiKey) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Mamute DJPLAYER <onboarding@resend.dev>",
      to: [testEmail],
      subject: "Teste Mamute DJPLAYER — Resend configurado",
      html: "<p>Se você recebeu este e-mail, a RESEND_API_KEY está válida para o Mamute DJPLAYER.</p>",
    }),
  });

  if (response.ok) {
    log("resend", `e-mail de teste enviado para ${testEmail}`);
    return true;
  }

  const detail = await response.text();
  log("resend", `falha no envio de teste (${response.status}): ${detail}`);
  return false;
}

async function validateProductionApi() {
  const health = await fetch(`${siteUrl}/api/dj/health`);
  const healthType = health.headers.get("content-type") ?? "";
  if (health.ok && healthType.includes("application/json")) {
    const body = await health.json();
    log("prod", `health OK — emailProvider=${body.emailProvider}`);
  } else {
    log("prod", "health ainda não em JSON (aguarde deploy ou função antiga)");
  }

  const response = await fetch(`${siteUrl}/api/dj/send-verification-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail }),
  });
  const body = await response.json();
  log("prod", `send-verification-code → emailSent=${body.emailSent} (${body.message ?? ""})`);
  return Boolean(body.emailSent);
}

async function main() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(`
[resend-setup] ERRO: RESEND_API_KEY não informada.

1. Crie a chave em https://resend.com/api-keys (login com ${testEmail})
2. Execute:
   node scripts/configure-resend.mjs re_SuaChaveAqui

Ou defina no .env:
   RESEND_API_KEY=re_SuaChaveAqui
   node scripts/configure-resend.mjs
`);
    process.exitCode = 1;
    return;
  }

  log("start", "configurando Resend no projeto e no Netlify");
  upsertEnvFile(apiKey);

  const resendOk = await validateResendKey(apiKey);
  if (!resendOk) {
    log("warn", "chave salva, mas o teste direto no Resend falhou — verifique domínio/remetente");
  }

  log("netlify", "gravando RESEND_API_KEY (todos os contextos)");
  const envOk = run("npx", [
    "netlify",
    "env:set",
    "RESEND_API_KEY",
    apiKey,
    "--context",
    "production",
    "--context",
    "deploy-preview",
    "--context",
    "dev",
  ]);
  if (!envOk) {
    process.exitCode = 1;
    return;
  }

  run("npx", ["netlify", "env:set", "SITE_URL", siteUrl, "--context", "production", "--context", "deploy-preview", "--context", "dev"]);
  run("npx", [
    "netlify",
    "env:set",
    "EMAIL_FROM",
    "Mamute DJPLAYER <onboarding@resend.dev>",
    "--context",
    "production",
    "--context",
    "deploy-preview",
    "--context",
    "dev",
  ]);

  log("deploy", "publicando produção…");
  const deployOk = run("npm", ["run", "build"]) && run("npx", ["netlify", "deploy", "--prod", "--dir=dist", "--message=Configure Resend email"]);
  if (!deployOk) {
    process.exitCode = 1;
    return;
  }

  log("validate", "aguardando propagação (20s)…");
  await new Promise((resolve) => setTimeout(resolve, 20_000));

  const prodOk = await validateProductionApi();
  if (prodOk) {
    log("done", `produção enviando e-mail real — teste em ${siteUrl}/dj com ${testEmail}`);
  } else {
    log("done", "deploy concluído; se emailSent=false, aguarde 1–2 min e teste Receber código no site");
  }
}

main().catch((error) => {
  console.error("[resend-setup] erro:", error);
  process.exitCode = 1;
});
