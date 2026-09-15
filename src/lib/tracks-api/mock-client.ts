import { RADIO_CLIPS } from "../../data/radio";
import { RADIO_IMPORTED_SEEDS } from "../../data/radio-imports";
import { matchesCamelotFilter, normalizeCamelotCode } from "../musical-key";
import type { RadioClip } from "../../types/radio";
import { synthesizeWaveformPreview } from "../waveform-preview-synthesize";
import { mapCatalogTrackToDetail, mapCatalogTrackToLibrary } from "./catalog-tracks";
import { mockDelayMs } from "./config";
import { TracksApiError } from "./errors";
import { createSilentWav } from "./silent-wav";
import {
  LIBRARY_LIST_DEFAULT_LIMIT,
  type AudioAnalysisResponse,
  type AudioPrepareResponse,
  type AudioStatusResponse,
  type LibrarySort,
  type LibraryTrack,
  type ListCatalogTracksParams,
  type ListTracksParams,
  type TrackDetail,
  type TrackListResponse,
  type TracksApiClient,
  type GenreListResponse,
  type SubgenreListResponse,
} from "./types";

export interface MockTracksClientOptions {
  delayMs?: number;
  prepareDelayMs?: number;
}

type SeedTrack = TrackDetail & { needsPrepare: boolean };

/** Subset do mock com áudio imediato, para dev e testes sem passo de prepare. */
export const MOCK_AUDIO_READY_IDS = new Set([
  "radio-spotify-02",
  "radio-spotify-03",
]);

/**
 * Cliente in-memory alinhado ao contrato JSON futuro do MusicDiscover.
 *
 * @param options Latência artificial. Zero deixa os testes síncronos o bastante.
 */
export function createMockTracksClient(options: MockTracksClientOptions = {}): TracksApiClient {
  const delayMs = options.delayMs ?? mockDelayMs();
  const prepareDelayMs = options.prepareDelayMs ?? delayMs;
  const seeds = buildSeedLibrary();
  const prepared = new Set<number>();
  const wav = createSilentWav();
  const taxonomy = buildGenreTaxonomy(seeds);

  return {
    async listTracks(params: ListTracksParams = {}): Promise<TrackListResponse> {
      assertCamelotQuery(params);
      assertGenreQuery(params, taxonomy);
      await wait(delayMs);
      const limit = clampInt(params.limit, 1, 200, LIBRARY_LIST_DEFAULT_LIMIT);
      const offset = clampInt(params.offset, 0, Number.MAX_SAFE_INTEGER, 0);
      const filtered = sortLibrary(seeds.filter((track) => matchesListFilters(track, params)), params.sort);
      return {
        total: filtered.length,
        offset,
        limit,
        tracks: filtered.slice(offset, offset + limit).map(toLibraryTrack),
      };
    },

    async listCatalogTracks(params: ListCatalogTracksParams = {}): Promise<TrackListResponse> {
      assertCatalogQuery(params);
      assertCamelotQuery(params);
      assertGenreQuery(params, taxonomy);
      await wait(delayMs);
      const limit = clampInt(params.limit, 1, 100, LIBRARY_LIST_DEFAULT_LIMIT);
      const offset = clampInt(params.offset, 0, Number.MAX_SAFE_INTEGER, 0);
      const filtered = seeds
        .filter((track) => track.beatport_id !== null)
        .filter((track) => matchesCatalogFilters(track, params));
      const tracks = filtered
        .slice(offset, offset + limit)
        .map((track) => mapCatalogTrackToLibrary(toCatalogResponse(track)));
      return {
        total: filtered.length,
        offset,
        limit,
        tracks,
      };
    },

    async getTrack(trackId: string): Promise<TrackDetail> {
      await wait(delayMs);
      const beatportId = Number(trackId.startsWith("bp:") ? trackId.slice(3) : NaN);
      if (Number.isFinite(beatportId) && beatportId > 0) {
        return this.getCatalogTrack(beatportId);
      }
      const found = seeds.find((track) => track.track_id === trackId);
      if (!found) {
        throw new TracksApiError("Faixa não encontrada", 404);
      }
      return toDetail(found);
    },

    async getCatalogTrack(beatportId: number): Promise<TrackDetail> {
      await wait(delayMs);
      const found = findByBeatport(seeds, beatportId);
      if (!found) {
        throw new TracksApiError("Faixa não encontrada", 404);
      }
      return mapCatalogTrackToDetail(toCatalogResponse(found));
    },

    async audioStatus(beatportId: number): Promise<AudioStatusResponse> {
      await wait(delayMs);
      const found = findByBeatport(seeds, beatportId);
      if (!found) {
        throw new TracksApiError("Faixa não encontrada", 404);
      }
      const available = !found.needsPrepare || prepared.has(beatportId);
      return {
        available,
        beatport_id: beatportId,
        source: available ? "local" : null,
        filename: available ? `${found.track_id}.wav` : null,
        duration_ms: found.length_ms,
      };
    },

    async prepareAudio(beatportId: number): Promise<AudioPrepareResponse> {
      await wait(prepareDelayMs);
      const found = findByBeatport(seeds, beatportId);
      if (!found) {
        return { ready: false, error: "Faixa não encontrada" };
      }
      if (found.beatport_id !== null) prepared.add(found.beatport_id);
      return { ready: true, error: null };
    },

    audioStreamUrl(beatportId: number): string {
      return `/api/tracks/${beatportId}/audio`;
    },

    async fetchAudio(
      beatportId: number,
      signal?: AbortSignal,
      _audioUrl?: string | null,
    ): Promise<ArrayBuffer> {
      throwIfAborted(signal);
      await wait(delayMs);
      throwIfAborted(signal);
      const found = findByBeatport(seeds, beatportId);
      if (!found) {
        throw new TracksApiError("Faixa não encontrada", 404);
      }
      const available = !found.needsPrepare || prepared.has(beatportId);
      if (!available) {
        throw new TracksApiError("Áudio ainda não preparado", 404);
      }
      return wav.slice(0);
    },

    async fetchAnalysis(
      beatportId: number,
      signal?: AbortSignal,
      _analysisUrl?: string | null,
    ): Promise<AudioAnalysisResponse> {
      throwIfAborted(signal);
      await wait(delayMs);
      throwIfAborted(signal);
      const found = findByBeatport(seeds, beatportId);
      if (!found) {
        throw new TracksApiError("Faixa não encontrada", 404);
      }
      return mockAnalysisPayload(beatportId, found);
    },

    async listGenres(query?: string): Promise<GenreListResponse> {
      await wait(delayMs);
      const needle = query?.trim().toLowerCase() ?? "";
      const genres = taxonomy.filter((item) =>
        needle ? item.name.toLowerCase().includes(needle) : true,
      );
      return {
        total: genres.length,
        synced_at: "2026-01-01T00:00:00",
        source: "mock",
        genres,
      };
    },

    async listSubgenres(genreId: number): Promise<SubgenreListResponse> {
      await wait(delayMs);
      const parent = taxonomy.find((item) => item.id === genreId);
      if (!parent) {
        throw new TracksApiError("Gênero não encontrado", 404);
      }
      return { genre_id: genreId, total: 0, subgenres: [] };
    },
  };
}

/**
 * Monta a biblioteca mock no shape da API a partir do catálogo editorial.
 */
export function buildSeedLibrary(): SeedTrack[] {
  return [...RADIO_CLIPS, ...RADIO_IMPORTED_SEEDS].map((clip) => fromRadioClip(clip));
}

/**
 * Converte um clipe editorial no shape de biblioteca da API.
 *
 * @param clip Clipe do catálogo FM usado como seed do mock.
 */
function fromRadioClip(clip: RadioClip): SeedTrack {
  const beatportId = fakeBeatportId(clip.id);
  const ready = MOCK_AUDIO_READY_IDS.has(clip.id);
  return {
    track_id: clip.id,
    beatport_id: beatportId,
    artists: clip.artist,
    title: clip.title,
    mix_name: ready ? "Original Mix" : null,
    bpm: clip.bpm,
    key: clip.key,
    camelot: clip.key,
    genre: clip.genre,
    label: clip.platform,
    length_ms: parseDurationMs(clip.duration),
    has_audio: ready,
    dj_ready: ready,
    release_year: null,
    analysis_url: `/api/tracks/${beatportId}/audio/analysis`,
    audio_url: ready ? `/api/tracks/${beatportId}/audio` : null,
    needsPrepare: !ready,
  };
}

/**
 * Remove o flag interno do payload público.
 *
 * @param seed Linha completa do mock.
 */
function toLibraryTrack(seed: SeedTrack): LibraryTrack {
  return {
    track_id: seed.track_id,
    beatport_id: seed.beatport_id,
    artists: seed.artists,
    title: seed.title,
    mix_name: seed.mix_name,
    bpm: seed.bpm,
    key: seed.key,
    camelot: seed.camelot,
    genre: seed.genre,
    label: seed.label,
    length_ms: seed.length_ms,
    waveform_preview: seed.beatport_id !== null ? synthesizeWaveformPreview(seed.beatport_id) : null,
    has_audio: seed.has_audio,
    dj_ready: seed.dj_ready,
  };
}

/**
 * Detalhe sem o flag de prepare.
 *
 * @param seed Linha completa do mock.
 */
function toDetail(seed: SeedTrack): TrackDetail {
  return {
    ...toLibraryTrack(seed),
    release_year: seed.release_year,
    analysis_url: seed.analysis_url,
    audio_url: seed.audio_url,
  };
}

/**
 * Filtra listagem por texto e flags de áudio.
 *
 * @param track Faixa candidata.
 * @param params Query da listagem.
 */
function matchesListFilters(track: SeedTrack, params: ListTracksParams): boolean {
  if (params.has_audio === true && !track.has_audio) return false;
  if (params.has_audio === false && track.has_audio) return false;
  if (params.dj_ready === true && !track.dj_ready) return false;
  if (params.dj_ready === false && track.dj_ready) return false;
  if (params.camelot) {
    const mode = params.camelot_mode ?? "exact";
    const trackKey = track.camelot ?? track.key;
    if (!matchesCamelotFilter(trackKey, params.camelot, mode)) return false;
  }
  if (params.genre) {
    if (normalizeGenreName(track.genre) !== normalizeGenreName(params.genre)) return false;
  }
  if (params.subgenre) {
    return false;
  }
  if (params.bpm_min !== undefined && (track.bpm === null || track.bpm < params.bpm_min)) {
    return false;
  }
  if (params.bpm_max !== undefined && (track.bpm === null || track.bpm > params.bpm_max)) {
    return false;
  }
  if (params.label) {
    if (normalizeGenreName(track.label) !== normalizeGenreName(params.label)) return false;
  }
  if (params.artist) {
    if (!containsNeedle(track.artists, params.artist)) return false;
  }
  if (params.track) {
    if (!containsNeedle(track.title, params.track)) return false;
  }
  if (params.release) {
    if (!containsNeedle(track.mix_name, params.release)) return false;
  }
  const needle = params.q?.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [track.title, track.artists, track.genre, track.mix_name, track.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Diz se o haystack contém o needle, ignorando caixa.
 *
 * @param haystack Campo da faixa.
 * @param raw Needle da query.
 */
function containsNeedle(haystack: string | null | undefined, raw: string): boolean {
  const needle = raw.trim().toLowerCase();
  if (!needle) return true;
  return (haystack ?? "").trim().toLowerCase().includes(needle);
}

/**
 * Valida `camelot` como na OpenAPI: código inválido retorna HTTP 422.
 *
 * @param params Query da listagem.
 */
function assertCamelotQuery(params: ListTracksParams): void {
  const raw = params.camelot?.trim();
  if (!raw) return;
  if (!normalizeCamelotCode(raw)) {
    throw new TracksApiError("Código Camelot inválido", 422);
  }
}

/**
 * Normaliza nome de gênero como o backend: trim, caixa baixa, espaços colapsados.
 *
 * @param value Nome bruto.
 */
function normalizeGenreName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Exige artist, track, release, label ou genre/genre_id, como no GET /api/catalog/tracks.
 *
 * `q` legado só conta quando vira `track` na ausência dos filtros explícitos.
 *
 * @param params Query do catálogo.
 */
function assertCatalogQuery(params: ListCatalogTracksParams): void {
  const artist = params.artist?.trim() ?? "";
  const track = params.track?.trim() || params.q?.trim() || "";
  const release = params.release?.trim() ?? "";
  const label = params.label?.trim() ?? "";
  const genre = params.genre?.trim() ?? "";
  const genreId = params.genre_id;
  if (
    artist.length > 0 ||
    track.length > 0 ||
    release.length > 0 ||
    label.length > 0 ||
    genre.length > 0 ||
    (genreId !== undefined && genreId > 0)
  ) {
    return;
  }
  throw new TracksApiError(
    "Informe ao menos um filtro: artist, track, release, label ou genre/genre_id",
    422,
  );
}

/**
 * Filtra sementes para o catálogo Beatport mock.
 *
 * @param track Faixa candidata.
 * @param params Query do catálogo.
 */
function matchesCatalogFilters(track: SeedTrack, params: ListCatalogTracksParams): boolean {
  const hasExplicitText = Boolean(
    params.artist?.trim() || params.track?.trim() || params.release?.trim(),
  );
  return matchesListFilters(track, {
    artist: params.artist,
    track: params.track || (hasExplicitText ? undefined : params.q),
    release: params.release,
    camelot: params.camelot,
    camelot_mode: params.camelot_mode,
    genre: params.genre,
    subgenre: params.subgenre,
    bpm_min: params.bpm_min,
    bpm_max: params.bpm_max,
    label: params.label,
  });
}

/**
 * Converte semente mock no shape bruto do catálogo Beatport.
 *
 * @param seed Linha completa do mock.
 */
function toCatalogResponse(seed: SeedTrack) {
  return {
    beatport_id: seed.beatport_id!,
    artists: seed.artists,
    title: seed.title,
    mix_name: seed.mix_name,
    bpm: seed.bpm,
    key: seed.key,
    camelot: seed.camelot,
    genre: seed.genre,
    label: seed.label,
    length_ms: seed.length_ms,
    cover_url: null,
    waveform_image_url: null,
  };
}

/**
 * Valida `genre` contra a taxonomia mock. Nome desconhecido é HTTP 422.
 *
 * @param params Query da listagem.
 * @param taxonomy Gêneros conhecidos.
 */
function assertGenreQuery(
  params: ListTracksParams | ListCatalogTracksParams,
  taxonomy: { name: string }[],
): void {
  const raw = params.genre?.trim();
  if (!raw) return;
  const normalized = normalizeGenreName(raw);
  if (!normalized) {
    throw new TracksApiError("gênero ou subgênero inválido", 422);
  }
  const known = taxonomy.some((item) => normalizeGenreName(item.name) === normalized);
  if (!known) {
    throw new TracksApiError(`gênero '${raw}' não encontrado no catálogo Beatport`, 422);
  }
}

/**
 * Monta chips de gênero a partir das sementes.
 *
 * @param seeds Biblioteca mock.
 */
function buildGenreTaxonomy(seeds: SeedTrack[]): Array<{ id: number; name: string; slug: string }> {
  const names = [...new Set(seeds.map((track) => track.genre).filter((genre): genre is string => Boolean(genre)))];
  names.sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
  return names.map((name, index) => ({
    id: index + 1,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  }));
}

/**
 * Ordena como GET /api/tracks?sort= na OpenAPI.
 *
 * @param tracks Faixas já filtradas.
 * @param sort Critério. Sem valor, usa title.
 */
function sortLibrary(tracks: SeedTrack[], sort: LibrarySort | undefined): SeedTrack[] {
  const copy = [...tracks];
  copy.sort((left, right) => {
    if (sort === "artist") {
      return compareText(left.artists, right.artists) || compareText(left.title, right.title);
    }
    if (sort === "updated") {
      return compareText(right.track_id, left.track_id);
    }
    return compareText(left.title, right.title) || compareText(left.artists, right.artists);
  });
  return copy;
}

/**
 * Compara texto ignorando caixa, com string vazia no fim.
 *
 * @param left Primeiro valor.
 * @param right Segundo valor.
 */
function compareText(left: string | null, right: string | null): number {
  return (left ?? "").localeCompare(right ?? "", "en", { sensitivity: "base" });
}

/**
 * Localiza a semente pelo id Beatport.
 *
 * @param seeds Biblioteca mock.
 * @param beatportId Chave de playback.
 */
function findByBeatport(seeds: SeedTrack[], beatportId: number): SeedTrack | undefined {
  return seeds.find((track) => track.beatport_id === beatportId);
}

/**
 * Gera bandas V10 sintéticas estáveis por beatport_id.
 *
 * @param beatportId Chave de playback.
 * @param points Quantidade de pontos por banda.
 */
function mockWaveformBands(beatportId: number, points = 128) {
  const bass = Array.from({ length: points }, (_, index) => {
    const phase = (index / points) * Math.PI * 2 + (beatportId % 41) * 0.02;
    return 0.2 + Math.abs(Math.sin(phase)) * 0.7;
  });
  const mids = Array.from({ length: points }, (_, index) => {
    const phase = (index / points) * Math.PI * 3 + (beatportId % 53) * 0.015;
    return 0.15 + Math.abs(Math.cos(phase * 1.4)) * 0.65;
  });
  const highs = Array.from({ length: points }, (_, index) => {
    const phase = (index / points) * Math.PI * 5 + (beatportId % 67) * 0.01;
    return 0.1 + Math.abs(Math.sin(phase * 0.8)) * 0.55;
  });
  return { preset: "dj_v1", bass, mids, highs };
}

/**
 * Gera análise V10 sintética para o mock, estável por beatport_id.
 *
 * @param beatportId Chave de playback.
 * @param seed Metadados da faixa.
 */
function mockAnalysisPayload(beatportId: number, seed: SeedTrack): AudioAnalysisResponse {
  const points = 1500;
  const waveform = Array.from({ length: points }, (_, index) => {
    const phase = (index / points) * Math.PI * 4 + (beatportId % 97) * 0.01;
    return 0.15 + Math.abs(Math.sin(phase)) * 0.75;
  });
  const durationSec = seed.length_ms ? seed.length_ms / 1000 : 180;
  const bpm = seed.bpm ?? 128;
  const waveform_bands = mockWaveformBands(beatportId, points);
  return {
    beatport_id: beatportId,
    available: true,
    version: 10,
    waveform,
    hop_ms: 50,
    points,
    waveform_bands,
    hot_cues: [],
    structure_cues: [],
    bar_seconds: (60 / bpm) * 4,
    bpm_refined: bpm,
    phrase_bars: 8,
    duration_hint_sec: durationSec,
  };
}

/**
 * Converte `m:ss` em milissegundos.
 *
 * @param duration Texto do catálogo de rádio.
 */
export function parseDurationMs(duration: string): number | null {
  const match = /^(\d+):(\d{2})$/.exec(duration.trim());
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000;
}

/**
 * Gera um beatport_id estável a partir do track_id canônico.
 *
 * @param trackId Id da faixa de treino ou rádio.
 */
export function fakeBeatportId(trackId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < trackId.length; index += 1) {
    hash ^= trackId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 20_000_000 + ((hash >>> 0) % 8_000_000);
}

/**
 * @param value Inteiro cru.
 * @param min Piso.
 * @param max Teto.
 * @param fallback Valor se NaN.
 */
function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * @param ms Espera artificial do mock.
 */
function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param signal Abort do LOAD da cabine.
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error("LOAD remoto cancelado");
    error.name = "AbortError";
    throw error;
  }
}
