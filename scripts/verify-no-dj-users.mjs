#!/usr/bin/env node
/**
 * Garante que não há DJs cadastrados em dj_accounts (e tabelas relacionadas vazias).
 *
 * Uso:
 *   npm run db:verify-users
 *   node scripts/verify-no-dj-users.mjs --target=production
 */
import { formatTargetLabel, parseDatabaseTarget, queryRows } from "./lib/run-sql.mjs";

const target = parseDatabaseTarget();
const label = formatTargetLabel(target);

const [countsRow] = await queryRows(
  "SELECT (SELECT COUNT(1) FROM dj_accounts)::int AS dj_accounts, (SELECT COUNT(1) FROM dj_profiles)::int AS dj_profiles, (SELECT COUNT(1) FROM dj_sessions)::int AS dj_sessions, (SELECT COUNT(1) FROM dj_academy_progress)::int AS dj_academy_progress",
  { target },
);

const counts = {
  dj_accounts: countsRow?.dj_accounts ?? 0,
  dj_profiles: countsRow?.dj_profiles ?? 0,
  dj_sessions: countsRow?.dj_sessions ?? 0,
  dj_academy_progress: countsRow?.dj_academy_progress ?? 0,
};

console.log(`[verify-no-dj-users:${label}]`, JSON.stringify(counts));

if (counts.dj_accounts > 0) {
  console.error(
    `[verify-no-dj-users:${label}] FALHA: ainda existem ${counts.dj_accounts} usuário(s).`,
  );
  process.exit(1);
}

console.log(`[verify-no-dj-users:${label}] OK — nenhum usuário cadastrado.`);
