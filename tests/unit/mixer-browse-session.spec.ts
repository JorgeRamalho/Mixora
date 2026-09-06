import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBrowseSessionSnapshot,
  resetBrowseSessionForSourceChange,
  setBrowseCursor,
  subscribeBrowseSession,
  updateBrowseSession,
} from "../../src/lib/mixer-browse-session";

describe("mixer-browse-session", () => {
  beforeEach(() => {
    resetBrowseSessionForSourceChange();
  });

  it("mantém cursor e filtros entre leituras do snapshot", () => {
    updateBrowseSession({
      cursorByDeck: { a: 4, b: 2 },
      browseKeyFilterByDeck: { a: "8A", b: null },
      browseCamelotMode: "exact",
    });

    const snapshot = getBrowseSessionSnapshot();
    expect(snapshot.cursorByDeck).toEqual({ a: 4, b: 2 });
    expect(snapshot.browseKeyFilterByDeck.a).toBe("8A");
    expect(snapshot.browseCamelotMode).toBe("exact");
  });

  it("notifica inscritos quando o cursor muda", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBrowseSession(listener);
    listener.mockClear();

    setBrowseCursor("b", 7);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getBrowseSessionSnapshot().cursorByDeck.b).toBe(7);
    unsubscribe();
  });

  it("zera cursor e filtros ao trocar a fonte do browse", () => {
    updateBrowseSession({
      cursorByDeck: { a: 9, b: 3 },
      browseKeyFilterByDeck: { a: "1B", b: "4A" },
      browseCamelotMode: "exact",
    });

    resetBrowseSessionForSourceChange();

    const snapshot = getBrowseSessionSnapshot();
    expect(snapshot.cursorByDeck).toEqual({ a: 0, b: 0 });
    expect(snapshot.browseKeyFilterByDeck).toEqual({ a: null, b: null });
    expect(snapshot.browseCamelotMode).toBe("compatible");
  });
});
