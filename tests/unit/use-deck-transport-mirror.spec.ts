import { describe, expect, it } from "vitest";
import { engine } from "../../src/lib/audio-engine";
import { paintDeckTransport } from "../../src/lib/use-deck-transport-mirror";

describe("paintDeckTransport", () => {
  it("espelha fase e relógios no DOM", () => {
    const attrs: Record<string, string> = {};
    const section = {
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      getAttribute(name: string) {
        return attrs[name] ?? null;
      },
    };
    const elapsed = { textContent: "" };
    const remain = { textContent: "" };
    const sectionRef = { current: section as HTMLElement };
    const elapsedRef = { current: elapsed as HTMLSpanElement };
    const remainRef = { current: remain as HTMLSpanElement };

    engine.snapshot.a.phase = 0.25;
    engine.snapshot.a.positionSec = 15;
    engine.snapshot.a.durationSec = 180;

    paintDeckTransport("a", sectionRef, elapsedRef, remainRef);

    expect(attrs["data-phase"]).toBe("0.250");
    expect(elapsed.textContent).toBe("00:15.0");
    expect(remain.textContent).toBe("-02:45.0");
  });
});
