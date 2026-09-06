import type { DeckFileMeta } from "../types/mixer";
import { decodeDeckBuffer } from "./deck-audio-decode";
import { analysisToPeaks } from "./waveform-from-analysis";
import { TracksApiError } from "./tracks-api/errors";
import type { RemoteLoadStatus, TrackDetail, TracksApiClient } from "./tracks-api/types";

export interface LoadRemoteTrackOptions {
  ctx: AudioContext;
  loadBuffer: (buffer: AudioBuffer, meta: DeckFileMeta) => void;
  track: TrackDetail;
  api: TracksApiClient;
  signal?: AbortSignal;
  onStatus?: (status: RemoteLoadStatus) => void;
}

/**
 * Carrega faixa remota no deck: status, prepare opcional, stream, análise V8,
 * decode e buffer com picos do backend quando disponíveis.
 *
 * @param options Contexto Web Audio, cliente HTTP e metadados já resolvidos.
 */
export async function loadRemoteTrackOnDeck(options: LoadRemoteTrackOptions): Promise<void> {
  const { ctx, loadBuffer, track, api, signal, onStatus } = options;
  const beatportId = track.beatport_id;
  if (beatportId === null) {
    throw new TracksApiError("Esta faixa não tem beatport_id para streaming", 422);
  }

  throwIfAborted(signal);
  onStatus?.("checking");
  let status = await api.audioStatus(beatportId);

  if (!status.available) {
    throwIfAborted(signal);
    onStatus?.("preparing");
    const prepared = await api.prepareAudio(beatportId, track);
    throwIfAborted(signal);
    status = await api.audioStatus(beatportId);
    if (!prepared.ready || !status.available) {
      throw new TracksApiError(prepared.error ?? "Falha ao preparar o áudio remoto", 409);
    }
  }

  throwIfAborted(signal);
  onStatus?.("decoding");
  const [data, analysis] = await Promise.all([
    api.fetchAudio(beatportId, signal, track.audio_url),
    api.fetchAnalysis(beatportId, signal, track.analysis_url).catch(() => null),
  ]);
  throwIfAborted(signal);
  const decoded = await decodeDeckBuffer(ctx, data, {
    title: track.title,
    bpm: track.bpm ?? undefined,
  });
  const peaks = analysisToPeaks(analysis);

  loadBuffer(decoded.buffer, {
    title: track.title,
    artist: track.artists,
    bpm: track.bpm ?? decoded.bpm,
    key: track.camelot ?? track.key ?? undefined,
    durationSec: decoded.durationSec,
    peaks,
  });
}

/**
 * @param signal Abort do LOAD.
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("LOAD remoto cancelado");
  error.name = "AbortError";
  throw error;
}
