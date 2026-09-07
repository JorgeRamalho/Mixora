import { describe, expect, test } from "vitest";
import { createHttpTracksClient } from "../../src/lib/tracks-api/http-client";
import { TracksApiError } from "../../src/lib/tracks-api/errors";

describe("tracks-api http-client", () => {
  test("listTracks monta query e lê o JSON", async () => {
    const calls: string[] = [];
    const api = createHttpTracksClient({
      baseUrl: "http://127.0.0.1:8765",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return jsonResponse({ total: 0, offset: 0, limit: 50, tracks: [] });
      },
    });

    const response = await api.listTracks({
      limit: 20,
      offset: 5,
      q: "argy",
      has_audio: true,
      sort: "artist",
    });
    expect(response.total).toBe(0);
    expect(calls[0]).toBe(
      "http://127.0.0.1:8765/api/tracks?limit=20&offset=5&q=argy&has_audio=true&sort=artist",
    );
  });

  test("listTracks repassa camelot e camelot_mode", async () => {
    const calls: string[] = [];
    const api = createHttpTracksClient({
      baseUrl: "http://127.0.0.1:8765",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return jsonResponse({ total: 0, offset: 0, limit: 50, tracks: [] });
      },
    });

    await api.listTracks({ camelot: "8A", camelot_mode: "compatible" });
    expect(calls[0]).toBe(
      "http://127.0.0.1:8765/api/tracks?camelot=8A&camelot_mode=compatible",
    );
  });

  test("getTrack 404 vira TracksApiError", async () => {
    const api = createHttpTracksClient({
      baseUrl: "",
      fetchImpl: async () => jsonResponse({ detail: "Faixa não encontrada" }, 404),
    });
    await expect(api.getTrack("missing")).rejects.toMatchObject({
      name: "TracksApiError",
      status: 404,
      message: "Faixa não encontrada",
    });
  });

  test("fetchAudio usa a URL de stream sem Content-Type JSON", async () => {
    const api = createHttpTracksClient({
      baseUrl: "http://127.0.0.1:8765",
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe("http://127.0.0.1:8765/api/tracks/20064632/audio");
        expect(init?.headers).toBeUndefined();
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
      },
    });
    const bytes = await api.fetchAudio(20064632);
    expect(bytes.byteLength).toBe(4);
    expect(api.audioStreamUrl(20064632)).toBe("http://127.0.0.1:8765/api/tracks/20064632/audio");
  });

  test("prepareAudio arredonda bpm float para inteiro", async () => {
    let body = "";
    const api = createHttpTracksClient({
      baseUrl: "http://127.0.0.1:8765",
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe("http://127.0.0.1:8765/api/tracks/21910691/audio/prepare");
        body = String(init?.body ?? "");
        return jsonResponse({ ready: true, error: null });
      },
    });
    await api.prepareAudio(21910691, { bpm: 127.6, title: "Levels" });
    expect(JSON.parse(body)).toMatchObject({ bpm: 128, title: "Levels" });
  });

  test("fetchAudio prefere audio_url relativa do detalhe", async () => {
    const api = createHttpTracksClient({
      baseUrl: "http://127.0.0.1:8765",
      fetchImpl: async (input) => {
        expect(String(input)).toBe("http://127.0.0.1:8765/api/tracks/21910691/audio");
        return new Response(new Uint8Array([9, 8]), { status: 200 });
      },
    });
    const bytes = await api.fetchAudio(1, undefined, "/api/tracks/21910691/audio");
    expect(bytes.byteLength).toBe(2);
  });

  test("fetchAnalysis usa analysis_url relativa do detalhe", async () => {
    const api = createHttpTracksClient({
      baseUrl: "http://127.0.0.1:8765",
      fetchImpl: async (input) => {
        expect(String(input)).toBe("http://127.0.0.1:8765/api/tracks/21910691/audio/analysis");
        return jsonResponse({
          beatport_id: 21910691,
          available: true,
          version: 8,
          waveform: [0.1, 0.8, 0.3],
          hop_ms: 50,
          points: 3,
          hot_cues: [],
        });
      },
    });
    const analysis = await api.fetchAnalysis(1, undefined, "/api/tracks/21910691/audio/analysis");
    expect(analysis.available).toBe(true);
    expect(analysis.waveform).toEqual([0.1, 0.8, 0.3]);
  });

  test("rede caída vira status 0", async () => {
    const api = createHttpTracksClient({
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(api.listTracks()).rejects.toBeInstanceOf(TracksApiError);
    await expect(api.listTracks()).rejects.toMatchObject({ status: 0 });
  });
});

/**
 * @param body JSON de resposta.
 * @param status HTTP.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
