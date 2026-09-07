# Mamute DJPLAYER

Mixer player para DJs iniciantes e avançados: visor digital, simulador de CDJ/controladora, academia, rádio em modo clipe e fichas oficiais de Beatport, Deezer, SoundCloud, YouTube e Spotify.

## Começar

```bash
npm install
npx playwright install chromium
npm run dev
```

Abrir [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Preview do build: `npm run live`. Testes: `npm test`.

## Documentação

A raiz deste repositório contém só entrada e configuração. O restante está em pastas:

| Pasta | Papel |
| --- | --- |
| [`docs/`](docs/README.md) | Planejamento, pesquisa, arquitetura e mapa de arquivos |
| [`src/`](src/README.md) | Código da aplicação |
| [`public/`](public/README.md) | Assets estáticos (favicon, OG, robots, sitemap) |
| [`tests/`](tests/README.md) | Playwright e2e |
| [`config/`](config/README.md) | TypeScript app/node e Playwright |

Índice completo: [docs/README.md](docs/README.md).
