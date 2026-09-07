# Arquitetura

SPA Vite + React 19 + TypeScript. Roteamento no cliente (React Router). Estilo em CSS3 com tokens. Persistência local (`localStorage`). Deploy estático na Netlify.

```
index.html
    └── src/main.tsx          entrada JS, CSS agregado
            └── src/app/App.tsx
                    ├── AppShell (header, ticker, footer)
                    └── Routes → pages/* → components/{domínio}
```

## Camadas em `src/`

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Entrada | `main.tsx` | Mount, CSS, normalização de URL (Live Server) |
| App | `app/` | Router, títulos por rota, shell |
| Páginas | `pages/` | Uma página por rota; só compõe |
| UI | `components/{domínio}/` | Widgets daquela superfície |
| Dados | `data/` | Conteúdo estático tipado |
| Lógica | `lib/` | Áudio, storage, academia, basename |
| Contrato | `types/` | Tipos por domínio |
| Visual | `styles/` | Tokens e folhas por superfície |

Páginas não falam com `localStorage` nem com Web Audio: isso fica em `lib/`. Componentes importam dados de `data/` e tipos de `types/`.

## Rotas

| Path | Página | Componente principal |
| --- | --- | --- |
| `/` | `HomePage` | `Hero` + visor |
| `/mixer` | `MixerPage` | `MixerBoard` |
| `/academia` | `AcademyPage` | `Classroom` |
| `/radio` | `RadioPage` | `RadioStudio` |
| `/catalogo` | `CatalogPage` | `CatalogHub` |
| `/dj` | `DjPage` | `RegisterForm` |

`base: "./"` no Vite permite preview relativo (`dist/`) e Live Server na pasta de build. O basename do React Router é derivado em `src/lib/base.ts`.

## Qualidade

Playwright em `tests/e2e/` sobe `npm run dev` e cobre SEO, usabilidade e identidade em desktop, tablet e mobile. Configuração: `config/playwright.config.ts`.
