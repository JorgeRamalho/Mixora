import { describe, expect, it } from "vitest";
import {
  EMPTY_COLLECTION_COLUMN_FILTERS,
  cloneCollectionColumnFilters,
  composeLibraryHaystackQuery,
  filterTracksByCollectionColumns,
  matchesCollectionColumnFilters,
  parseCollectionBpmRange,
  resolveCollectionLibraryQuery,
} from "../../src/lib/collection-column-filters";
import type { BrowseTrackItem } from "../../src/types/mixer";

/**
 * Monta uma faixa da collection com defaults estáveis para o recorte por coluna.
 *
 * @param patch Campos que o caso de teste quer variar.
 */
function track(patch: Partial<BrowseTrackItem> & Pick<BrowseTrackItem, "id">): BrowseTrackItem {
  return {
    title: "Untitled",
    artist: "Unknown",
    albumOrMix: null,
    genre: null,
    bpm: null,
    key: null,
    musicalKey: null,
    label: null,
    durationMs: 180_000,
    waveformPreview: null,
    ...patch,
  };
}

const daft = track({
  id: "daft",
  title: "One More Time",
  artist: "Daft Punk",
  albumOrMix: "Discovery",
  bpm: 123,
  key: "5A",
  label: "Virgin",
});

const prydz = track({
  id: "prydz",
  title: "Pjanoo",
  artist: "Eric Prydz",
  albumOrMix: "Pjanoo EP",
  bpm: 128,
  key: "1B",
  label: "Pryda",
});

const catalog = [daft, prydz];

describe("collection-column-filters", () => {
  it("mapeia colunas para artist, track e release sem q", () => {
    expect(
      resolveCollectionLibraryQuery({
        ...EMPTY_COLLECTION_COLUMN_FILTERS,
        artist: "daft",
        title: "pjanoo",
        album: "discovery",
        label: "virgin",
      }),
    ).toMatchObject({
      artist: "daft",
      track: "pjanoo",
      release: "discovery",
      label: "virgin",
    });
    expect(composeLibraryHaystackQuery({
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      artist: "daft",
      title: "pjanoo",
    })).toBe("pjanoo");
    expect(composeLibraryHaystackQuery(EMPTY_COLLECTION_COLUMN_FILTERS)).toBe("");
  });

  it("lê BPM exato, intervalo e mínimo com plus", () => {
    expect(parseCollectionBpmRange("128")).toEqual({ min: 128, max: 128 });
    expect(parseCollectionBpmRange("120-128")).toEqual({ min: 120, max: 128 });
    expect(parseCollectionBpmRange("128-120")).toEqual({ min: 120, max: 128 });
    expect(parseCollectionBpmRange("120+")).toEqual({ min: 120, max: undefined });
    expect(parseCollectionBpmRange("lento")).toBeNull();
  });

  it("envia Camelot canônico só quando o código fecha", () => {
    expect(resolveCollectionLibraryQuery({ ...EMPTY_COLLECTION_COLUMN_FILTERS, camelot: "8a" })).toEqual(
      {
        artist: "",
        track: "",
        release: "",
        label: "",
        bpmMin: undefined,
        bpmMax: undefined,
        columnCamelot: "8A",
      },
    );
    expect(resolveCollectionLibraryQuery({ ...EMPTY_COLLECTION_COLUMN_FILTERS, camelot: "8" }).columnCamelot).toBeNull();
    expect(resolveCollectionLibraryQuery({ ...EMPTY_COLLECTION_COLUMN_FILTERS, bpm: "128" })).toMatchObject({
      bpmMin: 128,
      bpmMax: 128,
    });
  });

  it("recorte AND não deixa Artista vazar para Faixa", () => {
    const artistOnly = cloneCollectionColumnFilters({
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      artist: "daft",
    });
    expect(matchesCollectionColumnFilters(daft, artistOnly)).toBe(true);
    expect(matchesCollectionColumnFilters(prydz, artistOnly)).toBe(false);

    const both = cloneCollectionColumnFilters({
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      artist: "daft",
      title: "pjanoo",
    });
    expect(filterTracksByCollectionColumns(catalog, both)).toEqual([]);
  });

  it("filtra BPM, Camelot parcial e label por substring", () => {
    const byBpm = filterTracksByCollectionColumns(catalog, {
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      bpm: "128",
    });
    expect(byBpm.map((item) => item.id)).toEqual(["prydz"]);

    const byRange = filterTracksByCollectionColumns(catalog, {
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      bpm: "120-124",
    });
    expect(byRange.map((item) => item.id)).toEqual(["daft"]);

    const byCamelot = filterTracksByCollectionColumns(catalog, {
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      camelot: "5",
    });
    expect(byCamelot.map((item) => item.id)).toEqual(["daft"]);

    const byLabel = filterTracksByCollectionColumns(catalog, {
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      label: "vir",
    });
    expect(byLabel.map((item) => item.id)).toEqual(["daft"]);
  });
});
