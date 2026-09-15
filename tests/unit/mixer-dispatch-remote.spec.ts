import { describe, expect, test } from "vitest";
import { createBrowseState } from "../../src/lib/mixer-browse";
import { dispatchMixerAction, resolveMixerAction, type MixerEngine } from "../../src/lib/mixer-dispatch";
import type { MixerSnapshot } from "../../src/types/mixer";
import { BROWSE_FIXTURE_TRACKS } from "../helpers/deck-track-fixtures";

describe("mixer-dispatch remote LOAD", () => {
  test("browseLoad remoto emite loadRemoteTrack com o cursor", () => {
    const { eng, browse } = setup();
    const plan = resolveMixerAction(eng, browse, { type: "browseLoad", id: "b" }, "remote");
    expect(plan).toEqual({
      kind: "ui-op",
      op: { kind: "loadRemoteTrack", deckId: "b", trackId: BROWSE_FIXTURE_TRACKS[0]!.id },
    });
  });

  test("browseLoad local também usa a API remota", () => {
    const { eng, browse } = setup();
    const plan = resolveMixerAction(eng, browse, { type: "browseLoad", id: "a" }, "local");
    expect(plan).toEqual({
      kind: "ui-op",
      op: { kind: "loadRemoteTrack", deckId: "a", trackId: BROWSE_FIXTURE_TRACKS[0]!.id },
    });
  });

  test("requestDeckLoad remoto usa o mesmo plano do browseLoad", () => {
    const { eng, browse } = setup();
    const ops: unknown[] = [];
    const result = dispatchMixerAction(
      {
        eng,
        browse,
        dispatchReducer: () => undefined,
        getBrowseSource: () => "remote",
        onUiOp: (op) => ops.push(op),
      },
      { type: "requestDeckLoad", id: "a" },
    );
    expect(result.kind).toBe("ui-only");
    expect(ops).toEqual([
      { kind: "loadRemoteTrack", deckId: "a", trackId: BROWSE_FIXTURE_TRACKS[0]!.id },
    ]);
  });

  test("requestDeckLoad source=file força picker mesmo em remote", () => {
    const { eng, browse } = setup();
    const plan = resolveMixerAction(
      eng,
      browse,
      { type: "requestDeckLoad", id: "a", source: "file" },
      "remote",
    );
    expect(plan).toEqual({ kind: "ui-op", op: { kind: "openFilePicker", deckId: "a" } });
  });

  test("loadRemoteTrack action vira ui-op", () => {
    const { eng, browse } = setup();
    const plan = resolveMixerAction(
      eng,
      browse,
      { type: "loadRemoteTrack", id: "a", trackId: "radio-youtube-01" },
      "remote",
    );
    expect(plan).toEqual({
      kind: "ui-op",
      op: { kind: "loadRemoteTrack", deckId: "a", trackId: "radio-youtube-01" },
    });
  });
});

/**
 * Engine e browse mínimos para o resolver, sem Web Audio.
 */
function setup(): {
  eng: MixerEngine;
  browse: ReturnType<typeof createBrowseState>;
} {
  const snapshot = { a: { track: { id: "" } }, masterDeck: "a" } as MixerSnapshot;
  const eng = { snapshot } as MixerEngine;
  let cursor = 0;
  const browse = createBrowseState({
    tracks: BROWSE_FIXTURE_TRACKS,
    getCursor: () => cursor,
    setCursor: (index) => {
      cursor = index;
    },
    snapshot: () => snapshot,
  });
  return { eng, browse };
}
