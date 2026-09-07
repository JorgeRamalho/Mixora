# Planejamento

## Produto

Mamute DJPLAYER é um mixer player pedagógico no browser. O DJ inicia no visor, treina beatmatch em dois decks (CDJ + controladora), estuda na academia, ouve a rádio em modo clipe e consulta o que cada plataforma realmente permite.

Não é um clone de rekordbox LINK. Streams de Beatport, Spotify, Deezer, SoundCloud e YouTube **não** entram no motor de mixagem. O simulador usa loops sintéticos (Web Audio API) para não violar termos.

## Escopo atual

| Superfície | Entrega |
| --- | --- |
| Home | Hero/visor, ticker, atalhos das três camadas |
| Mixer | Deck A (CDJ house) + Deck B (controladora techno), EQ, pitch, crossfader. MIDI DDJ-400 no Escopo 1, que são as ondas 1 a 6. O Escopo 2, em que o grafo de áudio muda, está em [mixer-midi-escopo-2.md](mixer-midi-escopo-2.md). |
| Academia | Módulos, aulas, dicas, exercícios e progresso em `localStorage` |
| Rádio | Fila de clipes via YouTube IFrame |
| Catálogo | Fichas oficiais: capacidade vs bloqueio de cada API |
| Área DJ | Cadastro em seções, persistido localmente e preparado para Netlify Forms |

## Convenção da raiz

A pasta raiz só aceita:

1. **Entrada** — `index.html` (HTML do Vite) e `src/main.tsx` (JS da aplicação, fora da raiz).
2. **Manifesto do pacote** — `package.json` e `package-lock.json`.
3. **Configuração que a ferramenta exige na raiz** — `vite.config.ts`, `tsconfig.json`, `netlify.toml`, `.oxlintrc.json`, `.gitignore`.
4. **Onboarding** — `README.md` curto, com ponte para `docs/`.

Tudo o mais vai para uma pasta nomeada. TypeScript de app/node e Playwright ficam em `config/`. Pesquisa, planejamento e mapas de arquivo ficam em `docs/`. Assets públicos ficam em `public/`.

Não coloque na raiz: SVG duplicado, CSS, páginas, tipos, relatórios de teste, rascunhos de pesquisa.

## Organização por pasta

Cada pasta referenciada neste repositório tem um `README.md` que lista **os arquivos daquela pasta** e o papel de cada um. Se um arquivo não cabe no README da pasta, ele está no lugar errado.

## Critérios de pronto

- `npm run typecheck` e `npm run build` passam.
- `npm test` cobre SEO, usabilidade e identidade nos viewports desktop, tablet e mobile.
- Deploy Netlify publica `dist/` com redirect SPA `/* → /index.html`.
