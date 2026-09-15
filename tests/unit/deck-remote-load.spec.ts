import { describe, expect, test } from "vitest";
import { loadRemoteTrackOnDeck } from "../../src/lib/deck-remote-load";
import {
  buildSeedLibrary,
  createMockTracksClient,
  fakeBeatportId,
  MOCK_AUDIO_READY_IDS,
} from "../../src/lib/tracks-api/mock-client";
import { TracksApiError } from "../../src/lib/tracks-api/errors";
import type { DeckFileMeta } from "../../src/types/mixer";
import { MockAudioContext } from "../helpers/mock-audio-context";

describe("deck-remote-load", () => {
  test("status disponível → decode → loadDeckBuffer", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const ctx = new MockAudioContext();
    const statuses: string[] = [];
    let loaded: { meta: DeckFileMeta } | null = null;
    const readyId = [...MOCK_AUDIO_READY_IDS][0]!;
    const track = await api.getTrack(readyId);

    await loadRemoteTrackOnDeck({
      ctx: ctx as unknown as AudioContext,
      api,
      track,
      onStatus: (status) => statuses.push(status),
      loadBuffer: (_buffer, meta) => {
        loaded = { meta };
      },
    });

    expect(statuses).toEqual(["checking", "decoding"]);
    expect(loaded?.meta.title).toBe(track.title);
    expect(loaded?.meta.artist).toBe(track.artists);
    expect(loaded?.meta.bpm).toBe(track.bpm);
    expect(loaded?.meta.key).toBe(track.key);
    expect(loaded?.meta.peaks?.length).toBe(512);
    expect(loaded?.meta.beatGrid?.bpm).toBe(track.bpm);
    expect(loaded?.meta.beatGrid?.offsetSec).toBe(0);
    expect(loaded?.meta.beatGrid?.phraseBars).toBe(8);
  });

  test("sem clip chama prepare antes do decode", async () => {
    const api = createMockTracksClient({ delayMs: 0, prepareDelayMs: 0 });
    const extra = buildSeedLibrary().find((track) => track.needsPrepare);
    expect(extra).toBeDefined();
    const track = await api.getTrack(extra!.track_id);
    const statuses: string[] = [];

    await loadRemoteTrackOnDeck({
      ctx: new MockAudioContext() as unknown as AudioContext,
      api,
      track,
      onStatus: (status) => statuses.push(status),
      loadBuffer: () => undefined,
    });

    expect(statuses).toEqual(["checking", "preparing", "decoding"]);
    expect((await api.audioStatus(fakeBeatportId(extra!.track_id))).available).toBe(true);
  });

  test("beatport_id ausente falha com 422", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const readyId = [...MOCK_AUDIO_READY_IDS][0]!;
    const track = await api.getTrack(readyId);
    await expect(
      loadRemoteTrackOnDeck({
        ctx: new MockAudioContext() as unknown as AudioContext,
        api,
        track: { ...track, beatport_id: null },
        loadBuffer: () => undefined,
      }),
    ).rejects.toMatchObject({ status: 422 } satisfies Partial<TracksApiError>);
  });

  test("abort cancela antes do stream", async () => {
    const api = createMockTracksClient({ delayMs: 20 });
    const readyId = [...MOCK_AUDIO_READY_IDS][0]!;
    const track = await api.getTrack(readyId);
    const controller = new AbortController();
    controller.abort();

    await expect(
      loadRemoteTrackOnDeck({
        ctx: new MockAudioContext() as unknown as AudioContext,
        api,
        track,
        signal: controller.signal,
        loadBuffer: () => {
          throw new Error("não deveria carregar");
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
