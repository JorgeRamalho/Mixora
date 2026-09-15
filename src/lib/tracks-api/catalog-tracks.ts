import type { CatalogTrackResponse, LibraryTrack, TrackDetail } from "./types";

/** Prefixo estável do `track_id` sintético para faixas só do catálogo Beatport. */
export const CATALOG_TRACK_ID_PREFIX = "bp:";

/**
 * Monta o id interno da collection para uma faixa do catálogo remoto.
 *
 * @param beatportId Chave Beatport da faixa.
 */
export function catalogTrackId(beatportId: number): string {
  return `${CATALOG_TRACK_ID_PREFIX}${beatportId}`;
}

/**
 * Extrai o beatport_id de um id sintético do catálogo.
 *
 * @param trackId Id da collection, por exemplo `bp:21910691`.
 */
export function parseCatalogTrackId(trackId: string): number | null {
  if (!trackId.startsWith(CATALOG_TRACK_ID_PREFIX)) return null;
  const parsed = Number(trackId.slice(CATALOG_TRACK_ID_PREFIX.length));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Adapta o JSON do catálogo Beatport para o shape usado pelo browse da cabine.
 *
 * @param track Item de GET /api/catalog/tracks.
 */
export function mapCatalogTrackToLibrary(track: CatalogTrackResponse): LibraryTrack {
  return {
    track_id: catalogTrackId(track.beatport_id),
    beatport_id: track.beatport_id,
    artists: track.artists,
    title: track.title,
    mix_name: track.mix_name,
    bpm: track.bpm,
    key: track.key,
    camelot: track.camelot,
    genre: track.genre,
    label: track.label,
    length_ms: track.length_ms,
    waveform_preview: null,
    has_audio: false,
    dj_ready: false,
  };
}

/**
 * Adapta o detalhe do catálogo para o fluxo de LOAD remoto.
 *
 * @param track Item de GET /api/catalog/tracks/{beatport_id}.
 */
export function mapCatalogTrackToDetail(track: CatalogTrackResponse): TrackDetail {
  const beatportId = track.beatport_id;
  return {
    ...mapCatalogTrackToLibrary(track),
    analysis_url: `/api/tracks/${beatportId}/audio/analysis`,
    audio_url: null,
  };
}
