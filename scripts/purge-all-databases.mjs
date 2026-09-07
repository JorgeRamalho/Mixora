#!/usr/bin/env node
/**
 * Remove todos os usuários DJ do banco local e da branch production.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = ["local", "production"];

function runScript(script, target) {
  const result = spawnSync("node", [script, `--target=${target}`], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) console.log(output);

  if (result.status !== 0) {
    console.error(`[purge-all-databases] Falha em --target=${target}`);
    process.exit(result.status ?? 1);
  }
}

for (const target of targets) {
  console.log(`[purge-all-databases] alvo: ${target}`);
  runScript("scripts/purge-dj-users.mjs", target);
  runScript("scripts/verify-no-dj-users.mjs", target);
}

console.log("[purge-all-databases] OK — local e production sem usuários.");
