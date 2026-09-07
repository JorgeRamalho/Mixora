# Estrutura de pastas e arquivos

Mapa do repositório depois da organização. Pastas geradas (`node_modules/`, `dist/`, `test-results/`) não entram neste inventário.

## Raiz — só entrada e config de ferramenta

| Arquivo | Por que fica na raiz |
| --- | --- |
| `index.html` | Entrada HTML do Vite |
| `package.json` / `package-lock.json` | Manifesto npm |
| `vite.config.ts` | Vite resolve a config na raiz do projeto |
| `tsconfig.json` | Solution: aponta para `config/tsconfig.*.json` |
| `.oxlintrc.json` | Oxlint (o CLI procura o arquivo na raiz) |
| `netlify.toml` | Netlify lê o TOML na raiz do site |
| `README.md` | Onboarding; detalhes em `docs/` |
| `.gitignore` | Git |

## Árvore

```
Projeto-Mamute-DJPLAYER/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── netlify.toml
├── README.md
├── .gitignore
├── .vscode/                 editor (Live Server → dist)
├── config/                  TypeScript + Playwright
├── docs/                    planejamento, pesquisa, arquitetura
├── public/                  estáticos copiados para dist/
├── src/                     aplicação
└── tests/                   e2e
```

## Inventário por pasta

Cada pasta abaixo tem o próprio `README.md` com a lista de arquivos.

| Pasta | README |
| --- | --- |
| `config/` | [config/README.md](../config/README.md) |
| `docs/` | [README.md](README.md) |
| `docs/pesquisa/` | [pesquisa/plataformas.md](pesquisa/plataformas.md) |
| `public/` | [public/README.md](../public/README.md) |
| `src/` | [src/README.md](../src/README.md) |
| `src/app/` | [src/app/README.md](../src/app/README.md) |
| `src/pages/` | [src/pages/README.md](../src/pages/README.md) |
| `src/components/` | [src/components/README.md](../src/components/README.md) |
| `src/data/` | [src/data/README.md](../src/data/README.md) |
| `src/lib/` | [src/lib/README.md](../src/lib/README.md) |
| `src/styles/` | [src/styles/README.md](../src/styles/README.md) |
| `src/types/` | [src/types/README.md](../src/types/README.md) |
| `tests/` | [tests/README.md](../tests/README.md) |

## O que não vai para a raiz

- Assets → `public/`
- CSS → `src/styles/`
- Tipos → `src/types/{domínio}.ts`
- Pesquisa de API → `docs/pesquisa/`
- Config TypeScript de app/node e Playwright → `config/`
