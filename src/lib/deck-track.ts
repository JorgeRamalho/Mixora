import type { DeckTrack } from "../types/mixer";

/** Metadados vazios com que cada deck nasce antes de um LOAD da API ou arquivo. */
export const EMPTY_DECK_TRACK: DeckTrack = {
  id: "",
  title: "",
  artist: "",
  genre: "",
  bpm: 128,
  key: "8A",
  scale: "",
  duration: "0:00",
  grid: "",
};
