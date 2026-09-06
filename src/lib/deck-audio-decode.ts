import { parseBpmFromFilename, titleFromFilename } from "./deck-metadata";

export interface DecodedDeckFile {
  buffer: AudioBuffer;
  durationSec: number;
  title: string;
  bpm?: number;
}

export interface DecodeDeckMeta {
  title?: string;
  bpm?: number;
}

/**
 * Decodifica bytes já lidos no `AudioContext` da cabine.
 *
 * Serve tanto o file picker quanto o stream HTTP, porque os dois chegam como
 * `ArrayBuffer` antes de virar `AudioBuffer`.
 *
 * @param ctx Contexto já criado por `ensure`.
 * @param data Bytes do arquivo ou do stream.
 * @param meta Título e BPM opcionais; o remote LOAD manda os do detalhe.
 */
export async function decodeDeckBuffer(
  ctx: AudioContext,
  data: ArrayBuffer,
  meta: DecodeDeckMeta = {},
): Promise<DecodedDeckFile> {
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(data);
  } catch {
    throw new Error("Arquivo de áudio inválido");
  }
  if (buffer.duration <= 0) {
    throw new Error("Arquivo de áudio inválido");
  }
  return {
    buffer,
    durationSec: buffer.duration,
    title: meta.title ?? "faixa",
    bpm: meta.bpm,
  };
}

/**
 * Decodifica um arquivo de áudio no `AudioContext` da cabine.
 *
 * @param ctx Contexto já criado por `ensure`.
 * @param file Arquivo escolhido no picker.
 */
export async function decodeDeckFile(ctx: AudioContext, file: File): Promise<DecodedDeckFile> {
  const data = await file.arrayBuffer();
  return decodeDeckBuffer(ctx, data, {
    title: titleFromFilename(file.name),
    bpm: parseBpmFromFilename(file.name),
  });
}
