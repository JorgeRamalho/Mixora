import { describe, expect, it } from "vitest";
import { filterBrowseTracks, filterLocalCollection, uniqueLocalGenres } from "../../src/lib/mixer-browse";
import { BROWSE_FIXTURE_TRACKS } from "../helpers/deck-track-fixtures";

describe("mixer-browse", () => {
  const catalog = BROWSE_FIXTURE_TRACKS;

  it("lista Pjanoo ao filtrar 1B no catálogo local", () => {
    const filtered = filterBrowseTracks(catalog, "1B", "exact");
    expect(filtered.some((track) => track.id === "radio-spotify-03")).toBe(true);
  });

  it("recorta o catálogo por gênero e busca sem chamar a API", () => {
    const seed = catalog.find((track) => track.genre);
    expect(seed?.genre).toBeTruthy();
    const byGenre = filterLocalCollection(catalog, {
      keyFilter: null,
      camelotMode: "compatible",
      genre: seed!.genre,
      q: "",
    });
    expect(byGenre.length).toBeGreaterThan(0);
    expect(byGenre.every((track) => track.genre === seed!.genre)).toBe(true);

    const needle = catalog[0]!.title.slice(0, 4);
    const byQuery = filterLocalCollection(catalog, {
      keyFilter: null,
      camelotMode: "compatible",
      genre: null,
      q: needle,
    });
    expect(byQuery.some((track) => track.id === catalog[0]!.id)).toBe(true);
  });

  it("extrai gêneros únicos do catálogo local", () => {
    const names = uniqueLocalGenres(catalog);
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right, "pt", { sensitivity: "base" })));
  });
});
