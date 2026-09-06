import { describe, expect, test } from "vitest";
import { TRAINING_TRACKS } from "../../src/data/training-tracks";
import { createBrowseState } from "../../src/lib/mixer-browse";
import { dispatchMixerAction, resolveMixerAction, type MixerEngine } from "../../src/lib/mixer-dispatch";
import type { MixerSnapshot } from "../../src/types/mixer";

describe("mixer-dispatch remote vs local LOAD", () => {
  test("browseLoad local arma o file picker", () => {
    const { eng, browseByDeck } = setup();
    const plan = resolveMixerAction(
      eng,
      browseByDeck,
      () => "a",
      { type: "browseLoad", id: "a" },
      "local",
    );
    expect(plan).toEqual({ kind: "ui-op", op: { kind: "armFilePicker", deckId: "a" } });
  });

  test("browseLoad remoto emite loadRemoteTrack com o cursor", () => {
    const { eng, browseByDeck } = setup();
    const plan = resolveMixerAction(
      eng,
      browseByDeck,
      () => "a",
      { type: "browseLoad", id: "b" },
      "remote",
    );
    expect(plan).toEqual({
      kind: "ui-op",
      op: { kind: "loadRemoteTrack", deckId: "b", trackId: TRAINING_TRACKS[0]!.id },
    });
  });

  test("requestDeckLoad remoto usa o mesmo plano do browseLoad", () => {
    const { eng, browseByDeck } = setup();
    const ops: unknown[] = [];
    const result = dispatchMixerAction(
      {
        eng,
        browseByDeck,
        getMasterDeck: () => "a",
        dispatchReducer: () => undefined,
        getBrowseSource: () => "remote",
        onUiOp: (op) => ops.push(op),
      },
      { type: "requestDeckLoad", id: "a" },
    );
    expect(result.kind).toBe("ui-only");
    expect(ops).toEqual([
      { kind: "loadRemoteTrack", deckId: "a", trackId: TRAINING_TRACKS[0]!.id },
    ]);
  });

  test("requestDeckLoad source=file força picker mesmo em remote", () => {
    const { eng, browseByDeck } = setup();
    const plan = resolveMixerAction(
      eng,
      browseByDeck,
      () => "a",
      { type: "requestDeckLoad", id: "a", source: "file" },
      "remote",
    );
    expect(plan).toEqual({ kind: "ui-op", op: { kind: "openFilePicker", deckId: "a" } });
  });

  test("loadRemoteTrack action vira ui-op", () => {
    const { eng, browseByDeck } = setup();
    const plan = resolveMixerAction(
      eng,
      browseByDeck,
      () => "a",
      { type: "loadRemoteTrack", id: "a", trackId: "radio-deezer-02" },
      "remote",
    );
    expect(plan).toEqual({
      kind: "ui-op",
      op: { kind: "loadRemoteTrack", deckId: "a", trackId: "radio-deezer-02" },
    });
  });
});

/**
 * Engine e browse mínimos para o resolver, sem Web Audio.
 */
function setup(): {
  eng: MixerEngine;
  browseByDeck: Record<"a" | "b", ReturnType<typeof createBrowseState>>;
} {
  const snapshot = { a: { track: { id: "radio-spotify-01" } }, masterDeck: "a" } as MixerSnapshot;
  const eng = { snapshot } as MixerEngine;
  let cursor = 0;
  const browse = createBrowseState({
    tracks: TRAINING_TRACKS,
    getCursor: () => cursor,
    setCursor: (index) => {
      cursor = index;
    },
    snapshot: () => snapshot,
  });
  return { eng, browseByDeck: { a: browse, b: browse } };
}
