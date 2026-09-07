import { joinApiUrl, resolveTracksApiBase } from "./config";
import { TracksApiError } from "./errors";
import { toQuery } from "./query";
import type {
  AudioAnalysisResponse,
  AudioPrepareResponse,
  AudioStatusResponse,
  LibraryTrack,
  ListTracksParams,
  TrackDetail,
  TrackListResponse,
  TracksApiClient,
} from "./types";

export interface HttpTracksClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Cliente HTTP fino contra `/api/tracks`. Sem interceptors: a Query faz retry.
 *
 * @param options Base URL e `fetch` injetável nos testes.
 */
export function createHttpTracksClient(options: HttpTracksClientOptions = {}): TracksApiClient {
  const baseUrl = options.baseUrl ?? resolveTracksApiBase();
  const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);

  return {
    listTracks(params: ListTracksParams = {}): Promise<TrackListResponse> {
      return requestJson(
        fetchImpl,
        joinApiUrl(
          baseUrl,
          `/api/tracks${          toQuery({
            limit: params.limit,
            offset: params.offset,
            q: params.q,
            has_audio: params.has_audio,
            dj_ready: params.dj_ready,
            sort: params.sort,
            camelot: params.camelot,
            camelot_mode: params.camelot_mode,
          })}`,
        ),
      );
    },

    getTrack(trackId: string): Promise<TrackDetail> {
      return requestJson(fetchImpl, joinApiUrl(baseUrl, `/api/tracks/${encodeURIComponent(trackId)}`));
    },

    audioStatus(beatportId: number): Promise<AudioStatusResponse> {
      return requestJson(fetchImpl, joinApiUrl(baseUrl, `/api/tracks/${beatportId}/audio/status`));
    },

    prepareAudio(beatportId: number, track?: Partial<LibraryTrack>): Promise<AudioPrepareResponse> {
      return requestJson(fetchImpl, joinApiUrl(baseUrl, `/api/tracks/${beatportId}/audio/prepare`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackBody(track)),
      });
    },

    audioStreamUrl(beatportId: number): string {
      return joinApiUrl(baseUrl, `/api/tracks/${beatportId}/audio`);
    },

    fetchAudio(beatportId: number, signal?: AbortSignal, audioUrl?: string | null): Promise<ArrayBuffer> {
      const url = resolveAudioUrl(baseUrl, beatportId, audioUrl);
      return requestBytes(fetchImpl, url, signal);
    },

    fetchAnalysis(
      beatportId: number,
      signal?: AbortSignal,
      analysisUrl?: string | null,
    ): Promise<AudioAnalysisResponse> {
      const url = resolveAnalysisUrl(baseUrl, beatportId, analysisUrl);
      return requestJson(fetchImpl, url, { signal });
    },
  };
}

/**
 * Resolve a URL do stream. Prefere `audio_url` do detalhe quando o backend manda.
 *
 * @param base Origem da API.
 * @param beatportId Chave de playback.
 * @param audioUrl Path relativo ou absoluto vindo de TrackDetailResponse.
 */
function resolveAudioUrl(base: string, beatportId: number, audioUrl?: string | null): string {
  if (audioUrl) {
    if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
    return joinApiUrl(base, audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`);
  }
  return joinApiUrl(base, `/api/tracks/${beatportId}/audio`);
}

/**
 * Resolve a URL da análise V8. Prefere `analysis_url` do detalhe quando o backend manda.
 *
 * @param base Origem da API.
 * @param beatportId Chave de playback.
 * @param analysisUrl Path relativo ou absoluto vindo de TrackDetailResponse.
 */
function resolveAnalysisUrl(base: string, beatportId: number, analysisUrl?: string | null): string {
  if (analysisUrl) {
    if (/^https?:\/\//i.test(analysisUrl)) return analysisUrl;
    return joinApiUrl(base, analysisUrl.startsWith("/") ? analysisUrl : `/${analysisUrl}`);
  }
  return joinApiUrl(base, `/api/tracks/${beatportId}/audio/analysis`);
}

/**
 * Corpo opcional do prepare, no shape que o MusicDiscover já aceita.
 *
 * @param track Metadados parciais da listagem.
 */
function trackBody(track?: Partial<LibraryTrack>): Record<string, unknown> {
  if (!track) return {};
  return {
    artists: track.artists,
    title: track.title,
    mix_name: track.mix_name,
    bpm: track.bpm === undefined || track.bpm === null ? null : Math.round(track.bpm),
    key: track.key,
    length_ms: track.length_ms,
  };
}

/**
 * GET/POST JSON com o mesmo tratamento de erro do client do MusicDiscover.
 *
 * @param fetchImpl Fetch injetável.
 * @param url URL absoluta ou relativa.
 * @param init Método e body.
 */
async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await send(fetchImpl, url, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * GET binário do stream de áudio.
 *
 * @param fetchImpl Fetch injetável.
 * @param url URL do clip.
 * @param signal Abort do LOAD.
 */
async function requestBytes(
  fetchImpl: typeof fetch,
  url: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await send(fetchImpl, url, { signal });
  return response.arrayBuffer();
}

/**
 * Executa o fetch e traduz falha de rede ou HTTP em TracksApiError.
 *
 * @param fetchImpl Fetch injetável.
 * @param url Destino.
 * @param init Opções.
 */
async function send(fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new TracksApiError(
      "Não foi possível falar com o servidor de faixas. Confira o MusicDiscover em http://127.0.0.1:8765 ou volte ao USB de treino.",
      0,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new TracksApiError(body.detail ?? `HTTP ${response.status}`, response.status);
  }
  return response;
}

/**
 * @param error Exceção do fetch.
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
