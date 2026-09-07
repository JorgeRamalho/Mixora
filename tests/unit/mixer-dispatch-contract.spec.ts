import { describe, expect, test } from "vitest";
import { applyAbsoluteAction } from "../../src/lib/mixer-dispatch";
import { MIXER_ACTION_ROUTES, getActionRoute } from "../../src/lib/mixer-action-routing";
import { assertAllowedInReducer } from "../../src/lib/mixer-assert";
import { MIXER_ACTION_SAMPLES } from "../helpers/mixer-contract-fixtures";

describe("contrato do reducer do mixer", () => {
  test("todo MixerAction type tem rota na tabela", () => {
    expect(Object.keys(MIXER_ACTION_SAMPLES).sort()).toEqual(Object.keys(MIXER_ACTION_ROUTES).sort());
    for (const type of Object.keys(MIXER_ACTION_ROUTES) as (keyof typeof MIXER_ACTION_ROUTES)[]) {
      expect(getActionRoute(type)).toBe(MIXER_ACTION_ROUTES[type]);
    }
  });

  test("misroute de toggle no reducer lança [MixerContract]", () => {
    expect(() => assertAllowedInReducer({ type: "toggle", id: "a" })).toThrow(/\[MixerContract\]/);
  });

  test("pitch no reducer não lança e applyAbsoluteAction chama setPitch", () => {
    const calls: string[] = [];
    const eng = {
      snapshot: { a: { phase: 0 } },
      setPitch: () => calls.push("setPitch"),
    } as unknown as Parameters<typeof applyAbsoluteAction>[0];
    expect(() => assertAllowedInReducer({ type: "pitch", id: "a", value: 2 })).not.toThrow();
    applyAbsoluteAction(eng, { type: "pitch", id: "a", value: 2 });
    expect(calls).toEqual(["setPitch"]);
  });
});
