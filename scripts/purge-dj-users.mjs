#!/usr/bin/env node
/**
 * Remove todos os DJs cadastrados (cascade em perfis, sessões e progresso).
 *
 * Uso:
 *   npm run db:purge-users
 *   npm run db:purge-users:production
 *   node scripts/purge-dj-users.mjs --target=production
 */
import { formatTargetLabel, parseDatabaseTarget, queryRows } from "./lib/run-sql.mjs";

const target = parseDatabaseTarget();
const label = formatTargetLabel(target);

const before = (await queryRows("SELECT COUNT(1)::int AS total FROM dj_accounts", { target }))[0]
  ?.total ?? 0;

if (before === 0) {
  console.log(`[purge-dj-users:${label}] Nenhum usuário cadastrado.`);
  process.exit(0);
}

await queryRows("DELETE FROM dj_accounts", { target });

const after = (await queryRows("SELECT COUNT(1)::int AS total FROM dj_accounts", { target }))[0]
  ?.total ?? 0;

console.log(
  `[purge-dj-users:${label}] Removidos ${before} usuário(s). Restantes: ${after}.`,
);

if (after !== 0) {
  console.error(`[purge-dj-users:${label}] Falha: ainda há registros em dj_accounts.`);
  process.exit(1);
}
