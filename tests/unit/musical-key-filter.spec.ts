import { describe, expect, it } from "vitest";
import {
  compatibleCamelotCodes,
  formatShiftedCamelotCode,
  formatShiftedKeyLabel,
  formatShiftedMusicalKeyLabel,
  keyAfterSemitoneShift,
  matchesCamelotFilter,
  matchesCamelotKey,
  normalizeCamelotCode,
  semitoneDelta,
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

describe("deslocamento de tom para KEY SYNC", () => {
  it("calcula o menor desvio de semitom entre dois Camelot", () => {
    expect(semitoneDelta("8A", "8A")).toBe(0);
    expect(semitoneDelta("3B", "4B")).toBe(-5);
    expect(semitoneDelta("4B", "3B")).toBe(5);
  });

  it("mantém o modo ao deslocar o root", () => {
    const shifted = keyAfterSemitoneShift("6A", 2);
    expect(shifted?.letter).toBe("A");
    expect(shifted?.nameIntl).toBe("Am");
  });

  it("rotula o tom com o ajuste", () => {
    expect(formatShiftedKeyLabel("6A", 0)).toBe("Gm ±0");
    expect(formatShiftedKeyLabel("6A", 2)).toBe("Am +2");
  });

  it("expõe o código Camelot depois do deslocamento", () => {
    expect(formatShiftedCamelotCode("8A", 0)).toBe("8A");
    expect(formatShiftedCamelotCode("6A", 2)).toBe("8A");
  });

  it("expõe o tom musical depois do deslocamento", () => {
    expect(formatShiftedMusicalKeyLabel("8A", 0)).toBe("Am");
    expect(formatShiftedMusicalKeyLabel("6A", 2)).toBe("Am");
  });
});
