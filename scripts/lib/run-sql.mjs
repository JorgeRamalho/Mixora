import { execSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "@netlify/database";
import { resolveDatabaseUrl } from "./db-url.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const connectionStringCache = new Map();

const LOCAL_TARGETS = new Set(["local", "dev"]);

/**
 * @returns {"local" | "production" | string}
 */
export function parseDatabaseTarget(argv = process.argv) {
  const fromArg = argv.find((entry) => entry.startsWith("--target="))?.slice("--target=".length)?.trim();
  const fromEnv = process.env.MAMUTE_DB_TARGET?.trim();
  const target = fromArg || fromEnv || "local";
  return target;
}

function isLocalhostUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function runNetlifyCli(command, args) {
  if (process.platform === "win32" && command[0] === "connect" && args.includes("--query")) {
    const queryIndex = args.indexOf("--query");
    const sql = args[queryIndex + 1];
    const hasJson = args.includes("--json");
    const escaped = sql.replace(/"/g, '\\"');
    const jsonFlag = hasJson ? " --json" : "";
    const cmd = `npx netlify database connect --query "${escaped}"${jsonFlag}`;
    const stdout = execSync(cmd, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }).trim();
    return stdout;
  }

  const result = spawnSync("npx", ["netlify", "database", ...command, ...args], {
    encoding: "utf8",
    shell: process.platform === "win32",
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  const stderr = result.stderr?.trim() ?? "";
  const stdout = result.stdout?.trim() ?? "";

  if (result.status !== 0) {
    throw new Error(stderr || stdout || `netlify database ${command[0]} falhou`);
  }

  return stdout;
}

function parseCliJson(stdout) {
  const trimmed = stdout.trim();
  const arrayStart = trimmed.indexOf("[");
  const objectStart = trimmed.indexOf("{");
  let start = -1;

  if (arrayStart >= 0 && objectStart >= 0) {
    start = Math.min(arrayStart, objectStart);
  } else {
    start = arrayStart >= 0 ? arrayStart : objectStart;
  }

  if (start < 0) {
    throw new Error(`netlify database connect retornou saída inválida: ${trimmed.slice(0, 120)}`);
  }

  return JSON.parse(trimmed.slice(start));
}

function queryViaNetlifyCli(sql) {
  const stdout = runNetlifyCli(["connect"], ["--query", sql, "--json"]);
  if (!stdout) {
    throw new Error("netlify database connect não retornou dados");
  }

  const rows = parseCliJson(stdout);
  if (!Array.isArray(rows)) {
    throw new Error("resposta inesperada do netlify database connect");
  }

  return rows;
}

function readRemoteConnectionString(branch) {
  const stdout = runNetlifyCli(
    ["status"],
    ["--branch", branch, "--show-credentials", "--json"],
  );
  const payload = JSON.parse(stdout);
  const connectionString = payload.database?.connectionString?.trim();

  if (!connectionString || connectionString.includes("***")) {
    throw new Error(
      `Não foi possível obter a connection string da branch "${branch}". ` +
        "Confirme que houve deploy com Netlify Database ativa.",
    );
  }

  return connectionString;
}

function resolveRemoteBranch(target) {
  if (target === "production" || target === "prod") return "production";
  return target;
}

function resolveConnectionString(target) {
  if (LOCAL_TARGETS.has(target)) {
    return undefined;
  }

  const cacheKey = resolveRemoteBranch(target);
  const cached = connectionStringCache.get(cacheKey);
  if (cached) return cached;

  const envUrl = resolveDatabaseUrl();
  if (envUrl && !isLocalhostUrl(envUrl)) {
    connectionStringCache.set(cacheKey, envUrl);
    return envUrl;
  }

  const connectionString = readRemoteConnectionString(cacheKey);
  connectionStringCache.set(cacheKey, connectionString);
  return connectionString;
}

async function queryViaDriver(sql, connectionString) {
  const { pool } = getDatabase({ connectionString });
  try {
    const result = await pool.query(sql);
    return result.rows;
  } finally {
    await pool.end();
  }
}

/**
 * Executa SQL de leitura/escrita e devolve linhas (array de objetos).
 * Local: `netlify database connect --query` (mantém o PGlite vivo).
 * Remoto: connection string da branch via `netlify database status --show-credentials`.
 */
export async function queryRows(sql, options = {}) {
  const target = options.target ?? parseDatabaseTarget();
  const connectionString = resolveConnectionString(target);

  if (connectionString) {
    return queryViaDriver(sql, connectionString);
  }

  return queryViaNetlifyCli(sql);
}

export function formatTargetLabel(target) {
  return LOCAL_TARGETS.has(target) ? "local" : resolveRemoteBranch(target);
}
