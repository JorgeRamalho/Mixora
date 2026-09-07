# Prioridade 2 — Testes unitários do audio-engine

Ver [plano orquestrador](./mixer-hardening-plano.md).

## Runner

Adicionar **Vitest** (`config/vitest.config.ts`, `npm run test:unit`). Compor `npm test` = unit + playwright.

## Arquivos CREATE

| Arquivo | Papel |
|---------|--------|
| `config/vitest.config.ts` | `testDir: tests/unit`, alias `@/` |
| `tests/unit/audio-engine.spec.ts` | ~35–50 casos |
| `tests/helpers/audio-engine-harness.ts` | `createTestEngine`, mock `AudioContext` |
| `tests/helpers/mock-audio-context.ts` | Mock com `currentTime` controlável |
| `tests/e2e/audio-engine-smoke.spec.ts` | *(opcional)* 1–2 smokes no Chromium |

## Arquivos MODIFY

| Arquivo | Mudança |
|---------|---------|
| `package.json` | `vitest`, scripts `test:unit` |
| `src/lib/audio-engine.ts` | `MamuteEngineOptions` com factory de `AudioContext`; namespace `__test__` |

## Casos obrigatórios

| Área | IDs | Foco |
|------|-----|------|
| `loadTrack` | L1–L6 | faixa, pitch reset, playing preservado, sync |
| `applySync` | S1–S5 | fórmula pitch, master deck |
| `applyGains` | G1–G6 | crossfader equal-power, master; booth/cueMix só snapshot |
| `toggle` | T1–T6 | ensure, offset por phase, loop source |
| `callCue` | C1–C4 | beat → phase, restart |
| `nudge` | N1–N5 | cdj vs vinyl, fake timers 120ms |
| `setPitch` | P1–P4 | playbackRate |
| `rebuildBuffer` | R1–R4 | duração ≈ (60/bpm)×8 beats |
| `phase loop` | PH1–PH5 | interval 50ms, `test.todo` para loop ativo (onda 8) |

## Harness

- **Camada A (padrão):** mock `AudioContext` — determinístico, CI Node
- **Camada B:** `OfflineAudioContext` — smoke de `buildLoop` (opcional, polyfill)
- **Camada C:** Playwright smoke — `analyser` com dados não-flat

## Cobertura alvo

- Linhas `audio-engine.ts`: ≥ 80%
- Funções públicas `MamuteEngine`: 100%

## Fronteira com P1

- P2 testa **engine direto**, sem `MixerAction`
- P1 testa roteamento; não duplicar browse/cursor aqui
