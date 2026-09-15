import type { DeckId, MixerSnapshot } from "../types/mixer";
/**
 * Clona o snapshot da cabine para o React enxergar mutação.
 *
 * O engine muta o objeto vivo, e por isso o reducer não pode devolver a
 * mesma referência. O clone é raso nos decks e profundo em EQ, loop, hot
 * cues e track, porque esses campos são os que a tela compara por identidade.
 *
 * @param snapshot Snapshot corrente do engine.
 */
export function cloneMixerSnapshot(snapshot: MixerSnapshot): MixerSnapshot {
  return {
    ...snapshot,
    a: {
      ...snapshot.a,
      eq: { ...snapshot.a.eq },
      loop: { ...snapshot.a.loop },
      hotCues: snapshot.a.hotCues.map((cue) => ({ ...cue })),
      track: { ...snapshot.a.track },
      peaks: snapshot.a.peaks,
      waveformV10: snapshot.a.waveformV10,
      beatGrid: snapshot.a.beatGrid ? { ...snapshot.a.beatGrid } : null,
    },
    b: {
      ...snapshot.b,
      eq: { ...snapshot.b.eq },
      loop: { ...snapshot.b.loop },
      hotCues: snapshot.b.hotCues.map((cue) => ({ ...cue })),
      track: { ...snapshot.b.track },
      peaks: snapshot.b.peaks,
      waveformV10: snapshot.b.waveformV10,
      beatGrid: snapshot.b.beatGrid ? { ...snapshot.b.beatGrid } : null,
    },
  };
}

/**
 * Converte a fase na unidade de cue do deck: beats no loop sintético,
 * segundos no arquivo real.
 *
 * @param snapshot Snapshot de onde ler a fase e o `sourceKind`.
 * @param id Deck a consultar.
 */
export function phaseToBeat(snapshot: MixerSnapshot, id: DeckId): number {
  const deck = snapshot[id];
  if (deck.sourceKind === "file") {
    return deck.phase * (deck.durationSec || 0);
  }
  return deck.phase * 8;
}
