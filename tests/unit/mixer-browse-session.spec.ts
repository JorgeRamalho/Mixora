import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_COLLECTION_COLUMN_FILTERS } from "../../src/lib/collection-column-filters";
import {
  getBrowseSessionSnapshot,
  resetBrowseSessionForSourceChange,
  setBrowseCursor,
  setCollectionColumnFilters,
  subscribeBrowseSession,
  updateBrowseSession,
} from "../../src/lib/mixer-browse-session";

describe("mixer-browse-session", () => {
  beforeEach(() => {
    resetBrowseSessionForSourceChange();
  });

  it("mantém cursor e filtros entre leituras do snapshot", () => {
    updateBrowseSession({
      cursor: 4,
      genreFilter: "House",
      genreId: 3,
      q: "avicii",
      browseKeyFilter: "8A",
      browseCamelotMode: "exact",
    });

    const snapshot = getBrowseSessionSnapshot();
    expect(snapshot.cursor).toBe(4);
    expect(snapshot.genreFilter).toBe("House");
    expect(snapshot.genreId).toBe(3);
    expect(snapshot.q).toBe("avicii");
    expect(snapshot.columnFilters).toEqual(EMPTY_COLLECTION_COLUMN_FILTERS);
    expect(snapshot.browseKeyFilter).toBe("8A");
    expect(snapshot.browseCamelotMode).toBe("exact");
  });

  it("grava colunas de busca e zera o cursor", () => {
    updateBrowseSession({ cursor: 6 });
    setCollectionColumnFilters({
      ...EMPTY_COLLECTION_COLUMN_FILTERS,
      artist: "daft",
      title: "one",
    });

    const snapshot = getBrowseSessionSnapshot();
    expect(snapshot.cursor).toBe(0);
    expect(snapshot.columnFilters.artist).toBe("daft");
    expect(snapshot.columnFilters.title).toBe("one");
    expect(snapshot.q).toBe("");
  });

  it("notifica inscritos quando o cursor muda", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBrowseSession(listener);
    listener.mockClear();

    setBrowseCursor(7);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getBrowseSessionSnapshot().cursor).toBe(7);
    unsubscribe();
  });

  it("zera cursor e filtros ao trocar a fonte do browse", () => {
    updateBrowseSession({
      cursor: 9,
      genreFilter: "Techno",
      genreId: 2,
      subgenreFilter: "Melodic",
      q: "argy",
      columnFilters: { ...EMPTY_COLLECTION_COLUMN_FILTERS, artist: "argy" },
      browseKeyFilter: "1B",
      browseCamelotMode: "exact",
    });

    resetBrowseSessionForSourceChange();

    const snapshot = getBrowseSessionSnapshot();
    expect(snapshot.cursor).toBe(0);
    expect(snapshot.genreFilter).toBeNull();
    expect(snapshot.genreId).toBeNull();
    expect(snapshot.subgenreFilter).toBeNull();
    expect(snapshot.q).toBe("");
    expect(snapshot.columnFilters).toEqual(EMPTY_COLLECTION_COLUMN_FILTERS);
    expect(snapshot.browseKeyFilter).toBeNull();
    expect(snapshot.browseCamelotMode).toBe("compatible");
  });
});
