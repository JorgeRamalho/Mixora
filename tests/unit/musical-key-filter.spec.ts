import { describe, expect, it } from "vitest";
import {
  compatibleCamelotCodes,
  matchesCamelotFilter,
  matchesCamelotKey,
  normalizeCamelotCode,
} from "../../src/lib/musical-key";

describe("filtro Camelot da biblioteca", () => {
  it("normaliza códigos com letra minúscula", () => {
    expect(normalizeCamelotCode("8a")).toBe("8A");
  });

  it("faz match exato entre faixa e filtro", () => {
    expect(matchesCamelotKey("8A", "8A")).toBe(true);
    expect(matchesCamelotKey("8B", "8A")).toBe(false);
  });

  it("modo compatible inclui vizinhos e relativo", () => {
    expect(compatibleCamelotCodes("8A").sort()).toEqual(["7A", "8A", "8B", "9A"]);
    expect(matchesCamelotFilter("7A", "8A", "compatible")).toBe(true);
    expect(matchesCamelotFilter("9B", "8A", "compatible")).toBe(false);
  });

  it("ignora faixas sem tom", () => {
    expect(matchesCamelotKey(null, "8A")).toBe(false);
  });
});
