import { resolveMusicalKey } from "../lib/musical-key";
import { RADIO_CLIPS } from "./radio";
import type { DeckId, TrainingTrack } from "../types/mixer";

/**
 * Biblioteca de treino da cabine, endereçada por **id** e não por posição.
 *
 * O valor de cada entrada é o rótulo de grade que só a cabine usa, ou seja o
 * catálogo de rádio continua sendo a fonte de título, BPM e tom.
 *
 * Endereçar por id importa por duas razões. Reordenar `RADIO_CLIPS` deixa de
 * trocar silenciosamente quais faixas entram no treino, e as chaves deste
 * objeto passam a formar um tipo, o que faz um id inexistente virar erro de
 * compilação em vez de um erro de runtime engolido por fallback.
 */
const TRAINING_GRIDS = {
  "radio-spotify-01": "HOUSE · 4/4",
  "radio-spotify-02": "PROG · 4/4",
  "radio-spotify-03": "ANTHEM · 4/4",
  "radio-deezer-01": "ELECTRO · 4/4",
  "radio-deezer-02": "ANTHEM · 4/4",
  "radio-youtube-01": "PROG · LONG",
  "radio-soundcloud-01": "UKG · 4/4",
  "radio-soundcloud-02": "MELODIC · 4/4",
  "radio-beatport-01": "HOUSE · 4/4",
  "radio-beatport-02": "PROG · LONG",
} as const;

/** Id de uma faixa que a biblioteca de treino realmente contém. */
export type TrainingTrackId = keyof typeof TRAINING_GRIDS;

/**
 * Monta a faixa de treino a partir do clipe de rádio de mesmo id.
 *
 * @param id Id já validado pelo tipo, presente em `TRAINING_GRIDS`.
 */
function fromRadio(id: TrainingTrackId): TrainingTrack {
  const clip = RADIO_CLIPS.find((item) => item.id === id);
  if (!clip) {
    throw new Error(`Radio clip ${id} not found`);
  }
  const musical = resolveMusicalKey(clip.key);
  return {
    id: clip.id,
    title: clip.title,
    artist: clip.artist,
    genre: clip.genre,
    bpm: clip.bpm,
    key: clip.key,
    scale: musical.label,
    duration: clip.duration,
    grid: TRAINING_GRIDS[id],
  };
}

export const TRAINING_TRACKS: TrainingTrack[] = (
  Object.keys(TRAINING_GRIDS) as TrainingTrackId[]
).map(fromRadio);

/**
 * Faixa com que cada deck nasce.
 *
 * O par é escolhido para a cabine abrir já demonstrando mixagem harmônica,
 * porque 4B e 3B são vizinhos na roda Camelot e os BPMs distam duas batidas,
 * ou seja o card de Key tem o que mostrar sem o aluno tocar em nada.
 *
 * O tipo é `TrainingTrackId`, e não `string`, porque um id fora da biblioteca
 * já fez as duas decks nascerem na mesma faixa por várias ondas.
 */
export const DEFAULT_DECK_TRACKS: Record<DeckId, TrainingTrackId> = {
  a: "radio-spotify-01",
  b: "radio-deezer-02",
};

/**
 * Procura uma faixa de treino por id cru, como o que chega do `<select>`.
 *
 * @param id Id vindo do DOM ou do MIDI, que pode não existir.
 */
export function getTrainingTrack(id: string): TrainingTrack | undefined {
  return TRAINING_TRACKS.find((track) => track.id === id);
}
