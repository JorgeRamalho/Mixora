# Prioridade 3 — Contrato do reducer (StrictMode-safe)

Ver [plano orquestrador](./mixer-hardening-plano.md). Depende de **P1**.

## Arquivos CREATE

| Arquivo | Papel |
|---------|--------|
| `src/lib/mixer-action-routing.ts` | `MIXER_ACTION_ROUTES`, `getActionRoute()` |
| `src/lib/mixer-assert.ts` | `assertAllowedInReducer` (dev-only throw) |
| `tests/e2e/mixer-dispatch-contract.spec.ts` | Cobertura do union + misroute |
| `docs/mixer-reducer-contract.md` | *(opcional)* changelog |

## Arquivos MODIFY

| Arquivo | Mudança |
|---------|---------|
| `src/lib/mixer-dispatch.ts` | Guards no `dispatchReducer` |
| `src/types/mixer.ts` | `@see mixer-action-routing` |
| `src/lib/midi/use-midi-controller.ts` | JSDoc: callback é `MixerDispatch` |

## Rotas

| Rota | Quem chama | Exemplos |
|------|------------|----------|
| `dispatch-only` | `dispatchAction` apenas | `toggle`, `nudge`, `browseLoad` |
| `reducer-only` | `dispatchAction` → `dispatch` | `pitch`, `loadTrack`, `eq` |
| `reducer-direct` | timer interno | `refresh` |

## Guards

```typescript
// Primeira linha do reducer em DEV:
assertAllowedInReducer(action); // throw se dispatch-only
```

## Testes contrato

1. Todo `MixerAction["type"]` tem entrada na tabela
2. Misroute `toggle` no reducer → throw `[MixerContract]`
3. `pitch` no reducer → `setPitch` 1×, sem throw
4. `midi-inject.spec.ts` regressão zero

## StrictMode (dev)

| Tipo | Risco double-invoke reducer |
|------|----------------------------|
| Setters absolutos | ✅ idempotente |
| `loadTrack`, `callCue` | ⚠️ glitch só em dev |
| Intenção via `dispatchAction` | 🛡️ engine 1× |

## Extensão P4

Novo `requestDeckLoad` → linha `dispatch-only` + teste de cobertura do union.
