import { describe, expect, test } from "vitest";
import { TRAINING_TRACKS } from "../../src/data/training-tracks";
import { RADIO_CLIPS } from "../../src/data/radio";
import { TracksApiError } from "../../src/lib/tracks-api/errors";
import {
  createMockTracksClient,
  fakeBeatportId,
  parseDurationMs,
} from "../../src/lib/tracks-api/mock-client";

const LIBRARY_FIELDS = [
  "track_id",
  "beatport_id",
  "artists",
  "title",
  "mix_name",
  "bpm",
  "key",
  "camelot",
  "genre",
  "label",
  "length_ms",
  "has_audio",
  "dj_ready",
] as const;

describe("tracks-api mock contract", () => {
  test("listTracks devolve paginação e o shape de LibraryTrack", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const extraClips = RADIO_CLIPS.filter(
      (clip) => !TRAINING_TRACKS.some((track) => track.id === clip.id),
    );
    const response = await api.listTracks({ limit: 50, offset: 0 });

    expect(response.offset).toBe(0);
    expect(response.limit).toBe(50);
    expect(response.total).toBe(TRAINING_TRACKS.length + extraClips.length);
    expect(response.tracks.length).toBe(response.total);

    const first = response.tracks[0];
    expect(first).toBeDefined();
    for (const field of LIBRARY_FIELDS) {
      expect(first).toHaveProperty(field);
    }

    const withAudio = response.tracks.find((track) => track.has_audio);
    expect(withAudio).toBeDefined();
    expect(withAudio?.dj_ready).toBe(true);
    expect(withAudio?.camelot).toBe(withAudio?.key);
    expect(withAudio?.beatport_id).toBe(fakeBeatportId(withAudio!.track_id));
  });

  test("sort=artist ordena por artistas", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const response = await api.listTracks({ sort: "artist" });
    const artists = response.tracks.map((track) => track.artists.toLowerCase());
    expect(artists).toEqual([...artists].sort((left, right) => left.localeCompare(right)));
  });

  test("q filtra por artista", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const response = await api.listTracks({ q: "argy" });
    expect(response.tracks.length).toBe(0);

    const avicii = await api.listTracks({ q: "avicii" });
    expect(avicii.total).toBeGreaterThan(0);
    expect(avicii.tracks.every((track) => track.artists.toLowerCase().includes("avicii"))).toBe(
      true,
    );
  });

  test("has_audio=true só devolve o subset com clip", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const response = await api.listTracks({ has_audio: true });
    expect(response.tracks.length).toBe(TRAINING_TRACKS.length);
    expect(response.tracks.every((track) => track.has_audio)).toBe(true);
  });

  test("camelot filtra por tom exato", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const seed = TRAINING_TRACKS[0]!;
    const response = await api.listTracks({ camelot: seed.key, limit: 200 });
    expect(response.total).toBeGreaterThan(0);
    expect(response.tracks.every((track) => track.camelot === seed.key)).toBe(true);
  });

  test("camelot_mode=compatible inclui vizinhos e relativo", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const response = await api.listTracks({ camelot: "8A", camelot_mode: "compatible", limit: 200 });
    const codes = new Set(response.tracks.map((track) => track.camelot));
    for (const code of ["7A", "8A", "8B", "9A"]) {
      if (response.tracks.some((track) => track.camelot === code)) {
        expect(codes.has(code)).toBe(true);
      }
    }
    expect(response.tracks.every((track) => ["7A", "8A", "8B", "9A"].includes(track.camelot ?? ""))).toBe(
      true,
    );
  });

  test("camelot inválido retorna HTTP 422", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    await expect(api.listTracks({ camelot: "99Z" })).rejects.toMatchObject({
      status: 422,
    });
  });

  test("getTrack 404 quando o id não existe", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    await expect(api.getTrack("missing-track")).rejects.toMatchObject({
      name: "TracksApiError",
      status: 404,
    });
  });

  test("getTrack devolve detalhe com os campos da listagem", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const id = TRAINING_TRACKS[0]!.id;
    const detail = await api.getTrack(id);
    expect(detail.track_id).toBe(id);
    expect(detail.analysis_url).toBe(`/api/tracks/${fakeBeatportId(id)}/audio/analysis`);
    expect(detail.audio_url).toBe(`/api/tracks/${fakeBeatportId(id)}/audio`);
    expect(detail.length_ms).toBe(parseDurationMs(TRAINING_TRACKS[0]!.duration));
  });

  test("audioStatus e fetchAudio no subset com clip", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const beatportId = fakeBeatportId(TRAINING_TRACKS[0]!.id);
    const status = await api.audioStatus(beatportId);
    expect(status.available).toBe(true);
    const bytes = await api.fetchAudio(beatportId);
    expect(bytes.byteLength).toBeGreaterThan(44);
  });

  test("fetchAnalysis devolve waveform V8 sintética", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const beatportId = fakeBeatportId(TRAINING_TRACKS[0]!.id);
    const analysis = await api.fetchAnalysis(beatportId);
    expect(analysis.available).toBe(true);
    expect(analysis.version).toBe(8);
    expect(analysis.waveform?.length).toBeGreaterThan(0);
  });

  test("prepare torna disponível uma faixa sem clip", async () => {
    const api = createMockTracksClient({ delayMs: 0, prepareDelayMs: 0 });
    const extra = RADIO_CLIPS.find(
      (clip) => !TRAINING_TRACKS.some((track) => track.id === clip.id),
    );
    expect(extra).toBeDefined();
    const beatportId = fakeBeatportId(extra!.id);

    const before = await api.audioStatus(beatportId);
    expect(before.available).toBe(false);

    const prepared = await api.prepareAudio(beatportId);
    expect(prepared.ready).toBe(true);

    const after = await api.audioStatus(beatportId);
    expect(after.available).toBe(true);
    const bytes = await api.fetchAudio(beatportId);
    expect(bytes.byteLength).toBeGreaterThan(16);
  });

  test("fetchAudio sem prepare falha com 404", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const extra = RADIO_CLIPS.find(
      (clip) => !TRAINING_TRACKS.some((track) => track.id === clip.id),
    );
    const beatportId = fakeBeatportId(extra!.id);
    await expect(api.fetchAudio(beatportId)).rejects.toBeInstanceOf(TracksApiError);
  });

  test("parseDurationMs e fakeBeatportId são estáveis", () => {
    expect(parseDurationMs("3:19")).toBe(199_000);
    expect(parseDurationMs("9:03")).toBe(543_000);
    expect(fakeBeatportId("radio-spotify-01")).toBe(fakeBeatportId("radio-spotify-01"));
    expect(fakeBeatportId("radio-spotify-01")).not.toBe(fakeBeatportId("radio-deezer-02"));
  });
});
