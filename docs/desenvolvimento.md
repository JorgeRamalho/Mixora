# Desenvolvimento

## Requisitos

Node.js 20+ e npm. Chromium do Playwright para os e2e.

```bash
npm install
npx playwright install chromium
```

## Automação (cadastro + código + login)

O fluxo pode rodar **sem intervenção manual** em desenvolvimento e nos testes:

| Comando | O que faz sozinho |
| --- | --- |
| `npm run setup` | Cria `.env` (se faltar), aplica migrações do banco |
| `npm run dev` | Bootstrap + `netlify dev` (API + banco + frontend em **8888**) |
| `npm run test:auth` | Testa cadastro → código → login (API e UI) |

### Sem `RESEND_API_KEY` (modo dev automático)

1. O servidor devolve `devCode` na resposta da API.
2. A UI preenche o código automaticamente em **Receber código**.
3. Os códigos também são gravados em `.dev/mail/latest.json` (sink local).

### Com `RESEND_API_KEY` (produção)

1. Cadastro grava no banco e dispara e-mail real via Resend.
2. O usuário confirma pelo link ou pelo código de 6 dígitos.
3. Login só libera após `emailVerified`.

### Health check

`GET /api/dj/health` — confirma API + banco. Usado pelo bootstrap e pelos testes.

### Único passo externo (uma vez)

- Criar conta no [Resend](https://resend.com) e colar `RESEND_API_KEY` no `.env` e no painel Netlify (produção).
- Vincular o site: `npx netlify init` + ativar Netlify Database.

Depois disso, `npm run dev` e `npm run test:auth` cobrem o ciclo completo.

## Scripts

| Script | Função |
| --- | --- |
| `npm run setup` | Bootstrap: `.env` + migrações |
| `npm run dev` | Bootstrap + Netlify dev com API + banco local em **http://localhost:8888** |
| `npm run dev:vite` | Só frontend Vite (sem API de e-mail) |
| `npm run build` | `tsc -b` + bundle em `dist/` |
| `npm run live:vite` | Garante o Vite em **5173** para o Go Live ler `src/` |
| `npm run live` | Build + preview na porta 5500 |
| `npm run preview` | Preview Vite (4173) |
| `npm run typecheck` | TypeScript sem emit |
| `npm run lint` | oxlint |
| `npm test` | Unitários Vitest e depois Playwright |
| `npm run test:unit` | Vitest em `tests/unit` (`config/vitest.config.ts`) |
| `npm run test:auth` | Fluxo automático cadastro → código → login |
| `npm run test:live` | Garante que o Go Live lê `src/` e não o `dist/` atrasado |
| `npm run test:ui` | Playwright UI |

## Live Server (VS Code)

O Go Live (**porta 5500**) tenta o Vite em `http://127.0.0.1:5173` (hot reload de `src/`). Se o Vite não responder, monta o bundle em `dist/`.

1. Com `index.html` aberto, **Go Live** — se `dist/` já existir, o app abre
2. Hot reload: `npm run live:vite` (ou **Ctrl+Shift+B**) e recarregue
3. Sem `dist/`: `npm run live:build`, depois recarregue com **Ctrl+Shift+R**

`.vscode/settings.json` ignora `src/` no Live Server para não dar reload cheio e brigar com o HMR.

## Deploy (Netlify)

`netlify.toml` na raiz:

- build: `npm run build`
- publish: `dist`
- SPA: `/*` → `/index.html` (200)
- headers: frame, sniff, referrer, permissions

Formulário de cadastro DJ: form oculto em `index.html` (`data-netlify="true"`) para o crawler da Netlify detectar os campos; o React envia via AJAX.

## Variáveis

Não há secrets no cliente. Para a Área do DJ com backend ativo (Netlify Functions + Database), configure no painel Netlify ou em `.env` local com `netlify dev`:

| Variável | Uso |
| --- | --- |
| `NETLIFY_DATABASE_URL` | Postgres (Netlify Database) — criada automaticamente ao provisionar |
| `RESEND_API_KEY` | Envio de códigos e links de verificação por e-mail |
| `EMAIL_FROM` | Remetente (ex.: `Mamute DJPLAYER <noreply@seudominio.com>`) |
| `SITE_URL` | URL pública do site (links de confirmação no e-mail) |

Sem `RESEND_API_KEY`, o cadastro e o login local continuam funcionando; os códigos por e-mail não são enviados.

### Ativar envio de código por e-mail (passo a passo)

1. **Vincule o projeto ao Netlify** (uma vez): `npx netlify init`
2. **Ative a Netlify Database** no painel do site (ou via CLI)
3. **Aplique as migrações**: `npm run db:migrate`
4. **Crie `.env` na raiz** (copie de `.env.example`) com `RESEND_API_KEY`, `EMAIL_FROM` e `SITE_URL`
5. **Inicie o dev com API**: `npm run dev` e abra **http://localhost:8888/dj** (não use a porta 5173 sozinha)
6. Use **Receber código** com o e-mail do cadastro DJ

> Não use Go Live (porta 5500) para testar e-mail — essa porta não executa a API.

APIs de parceiro (Beatport, Spotify, YouTube Data) exigem backend e ficam fora do escopo atual — ver [pesquisa/plataformas.md](pesquisa/plataformas.md).
