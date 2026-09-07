import { MamuteEngine } from "../../src/lib/audio-engine";
import { MockAudioContext } from "./mock-audio-context";

/**
 * Sobe um engine com `AudioContext` mockado, pronto para os testes de P2.
 *
 * @param options `ensure` liga o grafo; o padrão é true porque a maioria
 * dos casos precisa de nós. `window` aponta para `globalThis` no Node.
 */
export async function createTestEngine(options: { ensure?: boolean } = {}): Promise<{
  engine: MamuteEngine;
  ctx: MockAudioContext;
}> {
  const g = globalThis as typeof globalThis & { window: typeof globalThis };
  if (typeof g.window === "undefined") {
    g.window = g;
  }

  const ctx = new MockAudioContext();
  const engine = new MamuteEngine({
    createAudioContext: () => ctx as unknown as AudioContext,
  });
  if (options.ensure !== false) {
    await engine.ensure();
  }
  return { engine, ctx };
}
