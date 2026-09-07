import { parseBpmFromFilename, titleFromFilename } from "./deck-metadata";

export interface DecodedDeckFile {
  buffer: AudioBuffer;
  durationSec: number;
  title: string;
  bpm?: number;
}

/**
 * Decodifica um arquivo de áudio no `AudioContext` da cabine.
 *
 * @param ctx Contexto já criado por `ensure`.
 * @param file Arquivo escolhido no picker.
 */
export async function decodeDeckFile(ctx: AudioContext, file: File): Promise<DecodedDeckFile> {
  const data = await file.arrayBuffer();
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
    title: titleFromFilename(file.name),
    bpm: parseBpmFromFilename(file.name),
  };
}
