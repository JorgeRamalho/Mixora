/** Limites de GET /api/tracks na OpenAPI do MusicDiscover. */
export const LIBRARY_LIST_DEFAULT_LIMIT = 50;
export const LIBRARY_LIST_MAX_LIMIT = 200;

/** Ordenação documentada em GET /api/tracks?sort=. */
export type LibrarySort = "title" | "artist" | "updated";

/** Modo de filtro Camelot em GET /api/tracks?camelot_mode=. */
export type CamelotFilterMode = "exact" | "compatible";

/** Item leve da biblioteca — schema OpenAPI LibraryTrackResponse. */
export interface LibraryTrack {
  track_id: string;
  beatport_id: number | null;
  artists: string;
  title: string;
  mix_name: string | null;
  bpm: number | null;
  key: string | null;
  camelot: string | null;
  genre: string | null;
  label: string | null;
  length_ms: number | null;
  has_audio: boolean;
  dj_ready: boolean;
}

/** Resposta paginada da listagem — schema OpenAPI TrackListResponse. */
export interface TrackListResponse {
  total: number;
  offset: number;
  limit: number;
  tracks: LibraryTrack[];
}

/** Query params de GET /api/tracks. */
export interface ListTracksParams {
  limit?: number;
  offset?: number;
  q?: string;
  has_audio?: boolean;
  dj_ready?: boolean;
  sort?: LibrarySort;
  /** Código Camelot `1A`–`12B`. Inválido no backend retorna HTTP 422. */
  camelot?: string;
  /** `exact` (default) ou `compatible` via roda harmônica. */
  camelot_mode?: CamelotFilterMode;
}

/** Detalhe — schema OpenAPI TrackDetailResponse. */
export interface TrackDetail extends LibraryTrack {
  release_year?: number | null;
  analysis_url?: string | null;
  audio_url?: string | null;
}

/** Disponibilidade do clip — schema OpenAPI AudioStatusResponse. */
export interface AudioStatusResponse {
  available: boolean;
  beatport_id?: number;
  source?: string | null;
  filename?: string | null;
  duration_ms?: number | null;
}

/** Resultado de POST .../audio/prepare — schema OpenAPI AudioPrepareResponse. */
export interface AudioPrepareResponse {
  ready: boolean;
  beatport_id?: number;
  source?: string | null;
  error?: string | null;
}

/** Hot cue V8 — schema OpenAPI HotCueModel. */
export interface HotCueAnalysis {
  id: string;
  kind: string;
  label: string;
  bar: number;
  sec: number;
  quality?: number | null;
}

/** Análise V8 — schema OpenAPI AudioAnalysisResponse. */
export interface AudioAnalysisResponse {
  beatport_id: number;
  available: boolean;
  version?: number | null;
  waveform?: number[] | null;
  hop_ms?: number | null;
  points?: number | null;
  hot_cues?: HotCueAnalysis[];
  bar_seconds?: number | null;
  bpm_refined?: number | null;
  phrase_bars?: number | null;
  duration_hint_sec?: number | null;
}

/**
 * Superfície compartilhada pelo mock e pelo cliente HTTP live.
 *
 * Trocar de modo não muda os callers, porque os métodos e o JSON são os mesmos.
 */
export interface TracksApiClient {
  listTracks(params?: ListTracksParams): Promise<TrackListResponse>;
  getTrack(trackId: string): Promise<TrackDetail>;
  audioStatus(beatportId: number): Promise<AudioStatusResponse>;
  prepareAudio(beatportId: number, track?: Partial<LibraryTrack>): Promise<AudioPrepareResponse>;
  audioStreamUrl(beatportId: number): string;
  fetchAudio(beatportId: number, signal?: AbortSignal, audioUrl?: string | null): Promise<ArrayBuffer>;
  fetchAnalysis(
    beatportId: number,
    signal?: AbortSignal,
    analysisUrl?: string | null,
  ): Promise<AudioAnalysisResponse>;
}

/** Fase visível no deck enquanto o LOAD remoto corre. */
export type RemoteLoadStatus = "idle" | "checking" | "preparing" | "decoding" | "error";
