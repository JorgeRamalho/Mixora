import { describe, expect, test } from "vitest";
import { TRAINING_TRACKS } from "../../src/data/training-tracks";
import { RADIO_CLIPS } from "../../src/data/radio";
import { loadRemoteTrackOnDeck } from "../../src/lib/deck-remote-load";
import { createMockTracksClient, fakeBeatportId } from "../../src/lib/tracks-api/mock-client";
import { TracksApiError } from "../../src/lib/tracks-api/errors";
import type { DeckFileMeta } from "../../src/types/mixer";
import { MockAudioContext } from "../helpers/mock-audio-context";

describe("deck-remote-load", () => {
  test("status disponível → decode → loadDeckBuffer", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const ctx = new MockAudioContext();
    const statuses: string[] = [];
    let loaded: { meta: DeckFileMeta } | null = null;
    const track = await api.getTrack(TRAINING_TRACKS[0]!.id);

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
  });

  test("sem clip chama prepare antes do decode", async () => {
    const api = createMockTracksClient({ delayMs: 0, prepareDelayMs: 0 });
    const extra = RADIO_CLIPS.find(
      (clip) => !TRAINING_TRACKS.some((track) => track.id === clip.id),
    );
    const track = await api.getTrack(extra!.id);
    const statuses: string[] = [];

    await loadRemoteTrackOnDeck({
      ctx: new MockAudioContext() as unknown as AudioContext,
      api,
      track,
      onStatus: (status) => statuses.push(status),
      loadBuffer: () => undefined,
    });

    expect(statuses).toEqual(["checking", "preparing", "decoding"]);
    expect((await api.audioStatus(fakeBeatportId(extra!.id))).available).toBe(true);
  });

  test("beatport_id ausente falha com 422", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const track = await api.getTrack(TRAINING_TRACKS[0]!.id);
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
    const track = await api.getTrack(TRAINING_TRACKS[0]!.id);
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
