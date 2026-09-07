# tests/

Testes de ponta a ponta e unitários. A config do Playwright está em `config/playwright.config.ts` (`npm test` roda unit + e2e). A do Vitest está em `config/vitest.config.ts` (`npm run test:unit`).

## helpers/

| Arquivo | Papel |
| --- | --- |
| `audio-engine-harness.ts` | `createTestEngine` com `AudioContext` mockado. |
| `mock-audio-context.ts` | Mock de `AudioContext`, buffer e nós para o Vitest. |

## unit/

| Arquivo | Papel |
| --- | --- |
| `audio-engine.spec.ts` | `MamuteEngine` com `AudioContext` mockado: load, sync, gains, toggle, cue, nudge, pitch, buffer e phase loop. |
| `mixer-dispatch-contract.spec.ts` | Tabela de rotas do union e throw `[MixerContract]` no misroute. |
| `waveform-peaks.spec.ts` | Bins e silêncio. |
| `deck-audio-decode.spec.ts` | Decode mockado e BPM no nome. |

## e2e/

| Arquivo | Papel |
| --- | --- |
| `seo.spec.ts` | Título, idioma, meta, landmarks e H1 por rota. |
| `usability.spec.ts` | Fluxos de uso (navegação, mixer, formulário, academia). |
| `identity.spec.ts` | Tipografia, tokens CSS, overflow e menu. |
| `mixer.spec.ts` | Layout, acessibilidade e regressão de rótulo da cabine. |
| `midi-status.spec.ts` | Chip da sessão MIDI nos quatro estados, e a `/mixer` viva sem controladora. |
| `midi-map.spec.ts` | Mapa puro da DDJ-400 e fila de coalesce, rodando no Node sem página. |
| `midi-inject.spec.ts` | Bytes injetados na página até o slider e o chip de browse, com o orçamento de latência. |
| `mixer-dispatch.spec.ts` | Dispatcher puro: intenção, loop guards e wrap do browse, sem página. |
| `mixer-dispatch-contract.spec.ts` | Cobertura do union `MixerAction` e misroute no reducer. |
| `mixer-deck-load.spec.ts` | Load de MP3 no deck, play, cue, peaks e regressão MIDI biblioteca. |

Viewports: desktop 1440×900, tablet 768×1024, mobile 390×844.
