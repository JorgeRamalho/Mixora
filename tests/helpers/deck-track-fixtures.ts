import type { DeckTrack } from "../../src/types/mixer";

/** Faixa sintética mais lenta para testes de sync e pitch. */
export const SLOW_DECK_TRACK: DeckTrack = {
  id: "test-slow",
  title: "Slow Test",
  artist: "Mamute",
  genre: "House",
  bpm: 124,
  key: "3B",
  scale: "Bb major",
  duration: "4:07",
  grid: "ANTHEM · 4/4",
};

/** Faixa sintética mais rápida para testes de sync e pitch. */
export const FAST_DECK_TRACK: DeckTrack = {
  id: "test-fast",
  title: "Fast Test",
  artist: "Mamute",
  genre: "Progressive House",
  bpm: 129,
  key: "11B",
  scale: "F# minor",
  duration: "3:32",
  grid: "PROG · LONG",
};

/** Catálogo mínimo para browse nos testes do dispatcher. */
export const BROWSE_FIXTURE_TRACKS = [
  { id: "radio-spotify-02", title: "One More Time", artist: "Daft Punk", genre: "French House", bpm: 123, key: "5A" },
  { id: "radio-spotify-03", title: "Pjanoo", artist: "Eric Prydz", genre: "Progressive House", bpm: 128, key: "1B" },
  { id: "radio-youtube-01", title: "Don't You Worry Child", artist: "Swedish House Mafia", genre: "Progressive House", bpm: 129, key: "11B" },
];
