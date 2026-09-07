#!/usr/bin/env node
/**
 * Repara o banco local da Netlify quando o PGlite trava (ex.: Windows WASM abort).
 * Remove artefatos corrompidos em .netlify/db e reaplica migrações.
 */
import { rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = join(root, ".netlify", "db");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

console.log("[repair-local-database] removendo PGlite local corrompido…");
if (existsSync(dbDir)) {
  rmSync(dbDir, { recursive: true, force: true });
}

console.log("[repair-local-database] aplicando migrações locais…");
const migrated = run("npx", ["netlify", "database", "migrations", "apply"]);
if (!migrated) {
  console.error(
    "[repair-local-database] migrações falharam — confira `npx netlify database status` ou use NETLIFY_DB_URL remoto no .env",
  );
  process.exit(1);
}

console.log("[repair-local-database] banco local pronto.");
