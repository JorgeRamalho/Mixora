import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function runVerify(target: string) {
  const result = spawnSync("node", ["scripts/verify-no-dj-users.mjs", `--target=${target}`], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });

  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

/**
 * Gate de banco vazio, fora da suíte paralela de propósito.
 *
 * Cadastro e login criam linhas em `dj_accounts` e o Playwright roda
 * `fullyParallel` em três projects, sem teardown. Por isso este spec, se
 * entrar na suíte, vira corrida: passa só se rodar antes de qualquer cadastro
 * e falha se rodar depois. O `npm run db:verify-users` continua sendo o
 * comando do gate. Para exercitar o spec, `DJ_EMPTY_GATE=1` depois de
 * `npm run db:purge-users`.
 */
const describeGate = process.env.DJ_EMPTY_GATE ? test.describe : test.describe.skip;

describeGate("Banco DJ — sem usuários cadastrados", () => {
  for (const target of ["local", "production"] as const) {
    test(`dj_accounts está vazio (${target})`, async () => {
      const result = runVerify(target);

      if (
        target === "production" &&
        /npx netlify link|must be linked/i.test(result.output)
      ) {
        test.skip(true, "produção exige npx netlify link, e este ambiente não está ligado");
      }

      if (result.status !== 0) {
        throw new Error(result.output || `verify-no-dj-users falhou (${target})`);
      }

      expect(result.output).toContain(`[verify-no-dj-users:${target}] OK`);
    });
  }
});
