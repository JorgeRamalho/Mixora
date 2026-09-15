import { describe, expect, it } from "vitest";
import { formatDeckClock } from "../../src/lib/deck-clock";

describe("formatDeckClock", () => {
  it("formata o decorrido com décimos", () => {
    expect(formatDeckClock(3.7)).toBe("00:03.7");
  });

  it("prefixa o restante com o sinal de menos", () => {
    expect(formatDeckClock(3.7, true)).toBe("-00:03.7");
  });

  it("não deixa o relógio negativo", () => {
    expect(formatDeckClock(-2)).toBe("00:00.0");
  });
});
