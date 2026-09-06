import { tracksApiMode } from "./config";
import { createHttpTracksClient } from "./http-client";
import { createMockTracksClient } from "./mock-client";
import type { TracksApiClient } from "./types";

let cached: TracksApiClient | null = null;

/**
 * Devolve o cliente da biblioteca. Mock por padrão, HTTP quando o modo é live.
 */
export function getTracksApi(): TracksApiClient {
  if (!cached) {
    cached = tracksApiMode() === "live" ? createHttpTracksClient() : createMockTracksClient();
  }
  return cached;
}

/**
 * Limpa o singleton. Só os testes devem chamar.
 */
export function resetTracksApiForTests(): void {
  cached = null;
}

export { TracksApiError } from "./errors";
export { tracksApiMode, resolveTracksApiBase, joinApiUrl, mockDelayMs } from "./config";
export { createHttpTracksClient } from "./http-client";
export { createMockTracksClient, fakeBeatportId, parseDurationMs } from "./mock-client";
export { toQuery } from "./query";
export type {
  AudioAnalysisResponse,
  AudioPrepareResponse,
  AudioStatusResponse,
  HotCueAnalysis,
  LibrarySort,
  LibraryTrack,
  ListTracksParams,
  RemoteLoadStatus,
  TrackDetail,
  TrackListResponse,
  TracksApiClient,
} from "./types";
export { LIBRARY_LIST_DEFAULT_LIMIT, LIBRARY_LIST_MAX_LIMIT } from "./types";
