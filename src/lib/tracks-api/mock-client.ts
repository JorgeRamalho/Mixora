import { RADIO_CLIPS } from "../../data/radio";
import { TRAINING_TRACKS } from "../../data/training-tracks";
import { matchesCamelotFilter, normalizeCamelotCode } from "../musical-key";
import type { RadioClip } from "../../types/radio";
import type { TrainingTrack } from "../../types/mixer";
import { mockDelayMs } from "./config";
import { TracksApiError } from "./errors";
import { createSilentWav } from "./silent-wav";
import type {
  AudioAnalysisResponse,
  AudioPrepareResponse,
  AudioStatusResponse,
  LibrarySort,
  LibraryTrack,
  ListTracksParams,
  TrackDetail,
  TrackListResponse,
  TracksApiClient,
} from "./types";

export interface MockTracksClientOptions {
  delayMs?: number;
  prepareDelayMs?: number;
}

type SeedTrack = TrackDetail & { needsPrepare: boolean };

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

  return {
    async listTracks(params: ListTracksParams = {}): Promise<TrackListResponse> {
      assertCamelotQuery(params);
      await wait(delayMs);
      const limit = clampInt(params.limit, 1, 200, 50);
      const offset = clampInt(params.offset, 0, Number.MAX_SAFE_INTEGER, 0);
      const filtered = sortLibrary(seeds.filter((track) => matchesListFilters(track, params)), params.sort);
      return {
        total: filtered.length,
        offset,
        limit,
        tracks: filtered.slice(offset, offset + limit).map(toLibraryTrack),
      };
    },

    async getTrack(trackId: string): Promise<TrackDetail> {
      await wait(delayMs);
      const found = seeds.find((track) => track.track_id === trackId);
      if (!found) {
        throw new TracksApiError("Faixa não encontrada", 404);
      }
      return toDetail(found);
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
  };
}

/**
 * Une treino (áudio pronto) e o restante do catálogo de rádio (precisa prepare).
 */
export function buildSeedLibrary(): SeedTrack[] {
  const trainingIds = new Set(TRAINING_TRACKS.map((track) => track.id));
  const fromTraining = TRAINING_TRACKS.map((track) => fromTrainingTrack(track));
  const extras = RADIO_CLIPS.filter((clip) => !trainingIds.has(clip.id)).map((clip) =>
    fromRadioClip(clip),
  );
  return [...fromTraining, ...extras];
}

/**
 * Converte a faixa de treino no shape de biblioteca.
 *
 * @param track Entrada de TRAINING_TRACKS.
 */
function fromTrainingTrack(track: TrainingTrack): SeedTrack {
  const beatportId = fakeBeatportId(track.id);
  return {
    track_id: track.id,
    beatport_id: beatportId,
    artists: track.artist,
    title: track.title,
    mix_name: "Original Mix",
    bpm: track.bpm,
    key: track.key,
    camelot: track.key,
    genre: track.genre,
    label: "Mamute USB",
    length_ms: parseDurationMs(track.duration),
    has_audio: true,
    dj_ready: true,
    release_year: null,
    analysis_url: `/api/tracks/${beatportId}/audio/analysis`,
    audio_url: `/api/tracks/${beatportId}/audio`,
    needsPrepare: false,
  };
}

/**
 * Converte um clipe de rádio que ainda não está no treino.
 *
 * @param clip Clipe do catálogo FM.
 */
function fromRadioClip(clip: RadioClip): SeedTrack {
  return {
    track_id: clip.id,
    beatport_id: fakeBeatportId(clip.id),
    artists: clip.artist,
    title: clip.title,
    mix_name: null,
    bpm: clip.bpm,
    key: clip.key,
    camelot: clip.key,
    genre: clip.genre,
    label: clip.platform,
    length_ms: parseDurationMs(clip.duration),
    has_audio: false,
    dj_ready: false,
    release_year: null,
    analysis_url: `/api/tracks/${fakeBeatportId(clip.id)}/audio/analysis`,
    audio_url: null,
    needsPrepare: true,
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
  const needle = params.q?.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [track.title, track.artists, track.genre, track.mix_name, track.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
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
 * Gera waveform V8 sintética para o mock, estável por beatport_id.
 *
 * @param beatportId Chave de playback.
 * @param seed Metadados da faixa.
 */
function mockAnalysisPayload(beatportId: number, seed: SeedTrack): AudioAnalysisResponse {
  const points = 128;
  const waveform = Array.from({ length: points }, (_, index) => {
    const phase = (index / points) * Math.PI * 4 + (beatportId % 97) * 0.01;
    return 0.15 + Math.abs(Math.sin(phase)) * 0.75;
  });
  const durationSec = seed.length_ms ? seed.length_ms / 1000 : 180;
  const bpm = seed.bpm ?? 128;
  return {
    beatport_id: beatportId,
    available: true,
    version: 8,
    waveform,
    hop_ms: 50,
    points,
    hot_cues: [],
    bar_seconds: (60 / bpm) * 4,
    bpm_refined: bpm,
    phrase_bars: 32,
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
