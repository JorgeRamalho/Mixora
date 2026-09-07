# config/

Configurações que as ferramentas aceitam fora da raiz. A raiz só guarda o que o Vite, o npm e a Netlify exigem no topo (`vite.config.ts`, `tsconfig.json`, `netlify.toml`, `package.json`).

| Arquivo | Papel |
| --- | --- |
| `tsconfig.app.json` | TypeScript do app (`src/`). Referenciado por `../tsconfig.json`. |
| `tsconfig.node.json` | TypeScript de `vite.config.ts` e deste Playwright. |
| `playwright.config.ts` | e2e: `testDir` → `../tests/e2e`, `outputDir` → `../test-results`. |
| `vitest.config.ts` | unit: `dir` → `../tests/unit`, alias `@/` → `src/`. |
