/** Limites de GET /api/tracks na OpenAPI do MusicDiscover. */
export const LIBRARY_LIST_DEFAULT_LIMIT = 20;
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
  /** Amplitudes 0–1 para preview compacto na collection. */
  waveform_preview?: number[] | null;
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

/** Item de GET /api/catalog/tracks — schema OpenAPI CatalogTrackResponse. */
export interface CatalogTrackResponse {
  beatport_id: number;
  artists: string;
  title: string;
  mix_name: string | null;
  bpm: number | null;
  key: string | null;
  camelot: string | null;
  genre: string | null;
  label: string | null;
  length_ms: number | null;
  cover_url?: string | null;
  waveform_image_url?: string | null;
}

/** Query params de GET /api/catalog/tracks. */
export interface ListCatalogTracksParams {
  limit?: number;
  offset?: number;
  /** Nome do artista. */
  artist?: string;
  /** Nome da faixa. */
  track?: string;
  /** Álbum, EP ou mix. */
  release?: string;
  genre?: string;
  genre_id?: number;
  subgenre?: string;
  camelot?: string;
  camelot_mode?: CamelotFilterMode;
  bpm_min?: number;
  bpm_max?: number;
  label?: string;
  /**
   * Legado. O backend mapeia para `track` quando artist/track/release estão
   * vazios. A collection não envia mais este parâmetro.
   */
  q?: string;
}

/** Query params de GET /api/tracks. */
export interface ListTracksParams {
  limit?: number;
  offset?: number;
  /** Nome do artista. */
  artist?: string;
  /** Nome da faixa. */
  track?: string;
  /** Álbum, EP ou mix. */
  release?: string;
  /**
   * Haystack legado da biblioteca local. GET /api/tracks ainda documenta `q`,
   * ao passo que o catálogo já o marcou deprecated.
   */
  q?: string;
  has_audio?: boolean;
  dj_ready?: boolean;
  sort?: LibrarySort;
  /** Código Camelot `1A`–`12B`. Inválido no backend retorna HTTP 422. */
  camelot?: string;
  /** `exact` (default) ou `compatible` via roda harmônica. */
  camelot_mode?: CamelotFilterMode;
  bpm_min?: number;
  bpm_max?: number;
  label?: string;
  /** Nome canônico Beatport. Desconhecido retorna HTTP 422. */
  genre?: string;
  subgenre?: string;
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

/** Bandas espectrais V10 — schema OpenAPI WaveformBandsModel. */
export interface WaveformBandsModel {
  preset: string;
  bass: number[];
  mids: number[];
  highs: number[];
}

/** Análise V8+ com bandas V10 opcionais — schema OpenAPI AudioAnalysisResponse. */
export interface AudioAnalysisResponse {
  beatport_id: number;
  available: boolean;
  version?: number | null;
  waveform?: number[] | null;
  hop_ms?: number | null;
  points?: number | null;
  waveform_bands?: WaveformBandsModel | null;
  hot_cues?: HotCueAnalysis[];
  structure_cues?: HotCueAnalysis[];
  bar_seconds?: number | null;
  bpm_refined?: number | null;
  phrase_bars?: number | null;
  duration_hint_sec?: number | null;
}

/** Item canônico de GET /api/genres. */
export interface GenreResponse {
  id: number;
  name: string;
  slug: string;
}

/** Lista completa de gêneros para facetas. */
export interface GenreListResponse {
  total: number;
  synced_at: string | null;
  source: string | null;
  genres: GenreResponse[];
}

/** Subgêneros de um gênero Beatport. */
export interface SubgenreListResponse {
  genre_id: number;
  total: number;
  subgenres: GenreResponse[];
}

/**
 * Superfície compartilhada pelo mock e pelo cliente HTTP live.
 *
 * Trocar de modo não muda os callers, porque os métodos e o JSON são os mesmos.
 */
export interface TracksApiClient {
  listTracks(params?: ListTracksParams): Promise<TrackListResponse>;
  listCatalogTracks(params?: ListCatalogTracksParams): Promise<TrackListResponse>;
  getTrack(trackId: string): Promise<TrackDetail>;
  getCatalogTrack(beatportId: number): Promise<TrackDetail>;
  audioStatus(beatportId: number): Promise<AudioStatusResponse>;
  prepareAudio(beatportId: number, track?: Partial<LibraryTrack>): Promise<AudioPrepareResponse>;
  audioStreamUrl(beatportId: number): string;
  fetchAudio(beatportId: number, signal?: AbortSignal, audioUrl?: string | null): Promise<ArrayBuffer>;
  fetchAnalysis(
    beatportId: number,
    signal?: AbortSignal,
    analysisUrl?: string | null,
  ): Promise<AudioAnalysisResponse>;
  listGenres(query?: string): Promise<GenreListResponse>;
  listSubgenres(genreId: number): Promise<SubgenreListResponse>;
}

/** Fase visível no deck enquanto o LOAD remoto corre. */
export type RemoteLoadStatus = "idle" | "checking" | "preparing" | "decoding" | "error";
