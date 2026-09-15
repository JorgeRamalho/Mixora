import { describe, expect, it } from "vitest";
import {
  endCollectionDrag,
  getCollectionDragTrackId,
  isCollectionDragActive,
  startCollectionDrag,
} from "../../src/lib/collection-drag";

describe("collection-drag", () => {
  it("marca a faixa em voo e limpa no fim", () => {
    endCollectionDrag();
    expect(isCollectionDragActive()).toBe(false);

    startCollectionDrag("radio-spotify-02");
    expect(isCollectionDragActive()).toBe(true);
    expect(getCollectionDragTrackId()).toBe("radio-spotify-02");

    endCollectionDrag();
    expect(isCollectionDragActive()).toBe(false);
    expect(getCollectionDragTrackId()).toBeNull();
  });
});
