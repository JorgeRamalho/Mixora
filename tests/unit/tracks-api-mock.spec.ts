import { describe, expect, test } from "vitest";
import { RADIO_CLIPS } from "../../src/data/radio";
import { RADIO_IMPORTED_SEEDS } from "../../src/data/radio-imports";
import { TracksApiError } from "../../src/lib/tracks-api/errors";
import {
  buildSeedLibrary,
  createMockTracksClient,
  fakeBeatportId,
  MOCK_AUDIO_READY_IDS,
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
  "waveform_preview",
  "has_audio",
  "dj_ready",
] as const;

describe("tracks-api mock contract", () => {
  test("listTracks devolve paginação e o shape de LibraryTrack", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const seeds = buildSeedLibrary();
    const response = await api.listTracks({ limit: 50, offset: 0 });

    expect(response.offset).toBe(0);
    expect(response.limit).toBe(50);
    expect(response.total).toBe(seeds.length);
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

    const daft = await api.listTracks({ q: "daft" });
    expect(daft.total).toBeGreaterThan(0);
    expect(daft.tracks.every((track) => track.artists.toLowerCase().includes("daft"))).toBe(true);
  });

  test("artist recorta a biblioteca por nome", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const daft = await api.listTracks({ artist: "daft" });
    expect(daft.total).toBeGreaterThan(0);
    expect(daft.tracks.every((track) => track.artists.toLowerCase().includes("daft"))).toBe(true);
  });

  test("catálogo exige artist, track, release, label ou gênero", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    await expect(api.listCatalogTracks({ limit: 1 })).rejects.toMatchObject({
      name: "TracksApiError",
      status: 422,
    });
    const byArtist = await api.listCatalogTracks({ artist: "daft", limit: 10 });
    expect(byArtist.total).toBeGreaterThan(0);
    expect(byArtist.tracks.every((track) => track.artists.toLowerCase().includes("daft"))).toBe(true);
  });

  test("has_audio=true só devolve o subset com clip", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const response = await api.listTracks({ has_audio: true });
    expect(response.tracks.length).toBe(MOCK_AUDIO_READY_IDS.size);
    expect(response.tracks.every((track) => track.has_audio)).toBe(true);
  });

  test("camelot filtra por tom exato", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const seed = buildSeedLibrary().find((track) => track.camelot === "5A");
    expect(seed).toBeDefined();
    const response = await api.listTracks({ camelot: seed!.camelot!, limit: 200 });
    expect(response.total).toBeGreaterThan(0);
    expect(response.tracks.every((track) => track.camelot === seed!.camelot)).toBe(true);
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

  test("genre desconhecido retorna HTTP 422, e listGenres lista a taxonomia", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    await expect(api.listTracks({ genre: "Gênero Inventado" })).rejects.toMatchObject({
      status: 422,
    });

    const taxonomy = await api.listGenres();
    expect(taxonomy.genres.length).toBeGreaterThan(0);
    const known = taxonomy.genres[0]!;
    const filtered = await api.listTracks({ genre: known.name, limit: 200 });
    expect(filtered.tracks.every((track) => track.genre === known.name)).toBe(true);
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
    const id = [...MOCK_AUDIO_READY_IDS][0]!;
    const clip = [...RADIO_CLIPS, ...RADIO_IMPORTED_SEEDS].find((item) => item.id === id);
    expect(clip).toBeDefined();
    const detail = await api.getTrack(id);
    expect(detail.track_id).toBe(id);
    expect(detail.analysis_url).toBe(`/api/tracks/${fakeBeatportId(id)}/audio/analysis`);
    expect(detail.audio_url).toBe(`/api/tracks/${fakeBeatportId(id)}/audio`);
    expect(detail.length_ms).toBe(parseDurationMs(clip!.duration));
  });

  test("audioStatus e fetchAudio no subset com clip", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const id = [...MOCK_AUDIO_READY_IDS][0]!;
    const beatportId = fakeBeatportId(id);
    const status = await api.audioStatus(beatportId);
    expect(status.available).toBe(true);
    const bytes = await api.fetchAudio(beatportId);
    expect(bytes.byteLength).toBeGreaterThan(44);
  });

  test("fetchAnalysis devolve waveform V10 com bandas espectrais", async () => {
    const api = createMockTracksClient({ delayMs: 0 });
    const id = [...MOCK_AUDIO_READY_IDS][0]!;
    const beatportId = fakeBeatportId(id);
    const analysis = await api.fetchAnalysis(beatportId);
    expect(analysis.available).toBe(true);
    expect(analysis.version).toBe(10);
    expect(analysis.waveform?.length).toBeGreaterThan(0);
    expect(analysis.waveform_bands?.preset).toBe("dj_v1");
    expect(analysis.waveform_bands?.bass.length).toBe(analysis.waveform_bands?.mids.length);
    expect(analysis.waveform_bands?.mids.length).toBe(analysis.waveform_bands?.highs.length);
  });

  test("prepare torna disponível uma faixa sem clip", async () => {
    const api = createMockTracksClient({ delayMs: 0, prepareDelayMs: 0 });
    const extra = buildSeedLibrary().find((track) => track.needsPrepare);
    expect(extra).toBeDefined();
    const beatportId = fakeBeatportId(extra!.track_id);

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
    const extra = buildSeedLibrary().find((track) => track.needsPrepare);
    const beatportId = fakeBeatportId(extra!.track_id);
    await expect(api.fetchAudio(beatportId)).rejects.toBeInstanceOf(TracksApiError);
  });

  test("parseDurationMs e fakeBeatportId são estáveis", () => {
    expect(parseDurationMs("3:19")).toBe(199_000);
    expect(parseDurationMs("9:03")).toBe(543_000);
    expect(fakeBeatportId("radio-spotify-02")).toBe(fakeBeatportId("radio-spotify-02"));
    expect(fakeBeatportId("radio-spotify-02")).not.toBe(fakeBeatportId("radio-spotify-03"));
  });
});
