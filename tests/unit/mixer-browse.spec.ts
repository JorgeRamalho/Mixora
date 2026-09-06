import { describe, expect, it } from "vitest";
import { TRAINING_TRACKS } from "../../src/data/training-tracks";
import { filterBrowseTracks } from "../../src/lib/mixer-browse";

describe("mixer-browse", () => {
  const catalog = TRAINING_TRACKS.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    bpm: track.bpm,
    key: track.key,
  }));

  it("lista Pjanoo ao filtrar 1B no USB de treino", () => {
    const filtered = filterBrowseTracks(catalog, "1B", "exact");
    expect(filtered.some((track) => track.id === "radio-spotify-03")).toBe(true);
  });

  it("mantém filtros independentes por deck", () => {
    const deckA = filterBrowseTracks(catalog, "4B", "exact");
    const deckB = filterBrowseTracks(catalog, "1B", "exact");
    expect(deckA.every((track) => track.key === "4B")).toBe(true);
    expect(deckB.every((track) => track.key === "1B")).toBe(true);
  });
});
