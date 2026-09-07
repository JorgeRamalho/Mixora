import { describe, expect, test } from "vitest";
import { parseDeckDropId } from "../../src/lib/mixer-track-drag";

describe("arraste da playlist para o deck", () => {
  test("só A e B são destinos válidos", () => {
    expect(parseDeckDropId("a")).toBe("a");
    expect(parseDeckDropId("b")).toBe("b");
    expect(parseDeckDropId("c")).toBeNull();
    expect(parseDeckDropId(null)).toBeNull();
    expect(parseDeckDropId("")).toBeNull();
  });
});
