import { resolveMusicalKey } from "../lib/musical-key";
import type { DeckId, TrainingTrack } from "../types/mixer";

/**
 * Biblioteca de treino da cabine, endereçada por **id** e não por posição.
 *
 * As chaves formam o tipo `TrainingTrackId`: um id inexistente vira erro de
 * compilação em vez de um fallback silencioso nos decks.
 */
const TRAINING_SEEDS = {
  "radio-spotify-01": {
    title: "Levels",
    artist: "Avicii",
    genre: "Progressive",
    bpm: 126,
    key: "4B",
    duration: "3:19",
    grid: "HOUSE · 4/4",
  },
  "radio-spotify-02": {
    title: "One More Time",
    artist: "Daft Punk",
    genre: "French House",
    bpm: 123,
    key: "5A",
    duration: "5:20",
    grid: "PROG · 4/4",
  },
  "radio-deezer-01": {
    title: "Titanium",
    artist: "David Guetta ft. Sia",
    genre: "Electro House",
    bpm: 126,
    key: "9B",
    duration: "4:05",
    grid: "ELECTRO · 4/4",
  },
  "radio-deezer-02": {
    title: "Wake Me Up",
    artist: "Avicii",
    genre: "Folk House",
    bpm: 124,
    key: "3B",
    duration: "4:07",
    grid: "ANTHEM · 4/4",
  },
  "radio-youtube-01": {
    title: "Don't You Worry Child",
    artist: "Swedish House Mafia",
    genre: "Progressive House",
    bpm: 129,
    key: "11B",
    duration: "3:32",
    grid: "PROG · LONG",
  },
} as const;

/** Id de uma faixa que a biblioteca de treino realmente contém. */
export type TrainingTrackId = keyof typeof TRAINING_SEEDS;

function fromSeed(id: TrainingTrackId): TrainingTrack {
  const seed = TRAINING_SEEDS[id];
  const musical = resolveMusicalKey(seed.key);
  return {
    id,
    title: seed.title,
    artist: seed.artist,
    genre: seed.genre,
    bpm: seed.bpm,
    key: seed.key,
    scale: musical.label,
    duration: seed.duration,
    grid: seed.grid,
  };
}

export const TRAINING_TRACKS: TrainingTrack[] = (Object.keys(TRAINING_SEEDS) as TrainingTrackId[]).map(
  fromSeed,
);

/**
 * Faixa com que cada deck nasce.
 *
 * O par é escolhido para a cabine abrir já demonstrando mixagem harmônica,
 * porque 4B e 3B são vizinhos na roda Camelot e os BPMs distam duas batidas.
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
