# Prioridade 1 — Extrair dispatcher do MixerBoard

Ver [plano orquestrador](./mixer-hardening-plano.md).

## Arquivos CREATE

| Arquivo | Papel |
|---------|--------|
| `src/lib/mixer-snapshot.ts` | `cloneMixerSnapshot`, `phaseToBeat` |
| `src/lib/mixer-browse.ts` | `wrapCursor`, `masterTrackIndex`, `createBrowseState` |
| `src/lib/mixer-dispatch.ts` | `applyAbsoluteAction`, `resolveMixerAction`, `dispatchMixerAction`, `createMixerDispatch` |
| `tests/unit/mixer-dispatch.test.ts` | Casos intent + browse (Vitest, após P2) **ou** `tests/e2e/mixer-dispatch.spec.ts` (padrão midi-map) |

## Arquivos MODIFY

| Arquivo | Mudança |
|---------|---------|
| `src/components/mixer/MixerBoard.tsx` | Delegar a `createMixerDispatch`; manter cursor, interval, MIDI |
| `src/types/mixer.ts` | JSDoc apontando para dispatcher |
| `src/lib/README.md` | Entradas dos novos módulos |

## API sugerida (mutável)

```typescript
export type MixerEngine = { snapshot: MixerSnapshot; /* setters + toggle, nudge, loadTrack */ };

export type BrowseState = {
  getCursor(): number;
  setCursor(index: number): void;
  resolveTrackId(index: number): string | null;
  masterTrackIndex(): number;
};

export type DispatchResult =
  | { kind: "noop" }
  | { kind: "ui-only" }
  | { kind: "applied" }
  | { kind: "refresh" }
  | { kind: "async"; whenDone: Promise<void> };

export function applyAbsoluteAction(eng: MixerEngine, action: MixerAction): void;
export function resolveMixerAction(eng: MixerEngine, browse: BrowseState, action: MixerAction): ResolvedPlan;
export function createMixerDispatch(deps: {
  eng: MixerEngine;
  browse: BrowseState;
  onRefresh: () => void;
  onUiOp?: (op: MixerUiOp) => void; // extensão P4
}): (action: MixerAction) => void;
```

## Mapa MixerAction (resumo)

| Classe | Exemplos | Onde resolve |
|--------|----------|--------------|
| Absoluta | `pitch`, `eq`, `loadTrack` | `applyAbsoluteAction` → reducer |
| Intenção | `toggle`, `nudge`, `cueButton`, `hotCuePad` | `resolveMixerAction` → engine 1× |
| Browse UI | `browseMove`, `browseHome` | só `BrowseState` |
| Browse → load | `browseLoad` | cursor → `loadTrack` |

## Testes mínimos

- `toggleSync` / `cueButton` playing vs paused
- `loopOn`/`loopOff` guards
- `browseLoad` com cursor
- `browseMove` wrap nos extremos da lista

## Migração

1. Extrair libs sem alterar `MixerBoard`
2. Testes verdes na lib nova
3. Wire `MixerBoard`
4. `npm test` — `midi-inject`, `mixer`, `midi-map` sem edição
