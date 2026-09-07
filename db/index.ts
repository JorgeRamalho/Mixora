import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

function isLocalPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isPostgres = parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
    return isPostgres && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function resolveDatabaseUrl(): string | undefined {
  for (const value of [process.env.NETLIFY_DB_URL, process.env.NETLIFY_DATABASE_URL, process.env.DATABASE_URL]) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

const databaseUrl = resolveDatabaseUrl();
if (databaseUrl) {
  if (!process.env.NETLIFY_DB_URL?.trim()) {
    process.env.NETLIFY_DB_URL = databaseUrl;
  }
  if (isLocalPostgresUrl(databaseUrl)) {
    process.env.NETLIFY_DB_DRIVER ??= "server";
  }
}

export const db = drizzle({ schema });
