import { spawnSync } from "node:child_process";

/**
 * Resolve a connection string from any supported Mamute DJ database env.
 * Order: NETLIFY_DB_URL (GA) → NETLIFY_DATABASE_URL (legacy) → DATABASE_URL → netlify CLI.
 */
export function resolveDatabaseUrl() {
  const candidates = [
    process.env.NETLIFY_DB_URL,
    process.env.NETLIFY_DATABASE_URL,
    process.env.DATABASE_URL,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    // URLs localhost ficam obsoletas entre sessões do PGlite — scripts locais usam o CLI.
    if (isEphemeralLocalUrl(trimmed)) continue;

    return trimmed;
  }

  return readNetlifyDatabaseConnectUrl();
}

export function requireDatabaseUrl(context = "scripts") {
  const url = resolveDatabaseUrl();
  if (url) return url;

  throw new Error(
    `[${context}] Banco indisponível: defina NETLIFY_DB_URL, NETLIFY_DATABASE_URL ou DATABASE_URL. ` +
      "Ative a Netlify Database (npx netlify database init) ou rode `npm run db:repair`.",
  );
}

function isEphemeralLocalUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function readNetlifyDatabaseConnectUrl() {
  const result = spawnSync("npx", ["netlify", "database", "connect", "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0 || !result.stdout?.trim()) {
    return undefined;
  }

  try {
    const payload = JSON.parse(result.stdout);
    const trimmed = typeof payload.connection_string === "string" ? payload.connection_string.trim() : "";
    return trimmed || undefined;
  } catch {
    return undefined;
  }
}
