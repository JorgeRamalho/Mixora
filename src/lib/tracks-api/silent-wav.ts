/**
 * Monta um WAV PCM 16-bit mono silencioso, válido para `decodeAudioData`.
 *
 * O mock não tem clip em disco, e por isso o LOAD remoto precisa de bytes que
 * o Web Audio aceite de verdade, e não um placeholder textual.
 *
 * @param durationSec Duração do clip. Meio segundo basta para o deck.
 * @param sampleRate Taxa do PCM.
 */
export function createSilentWav(durationSec = 0.4, sampleRate = 44100): ArrayBuffer {
  const numSamples = Math.max(16, Math.floor(durationSec * sampleRate));
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  return buffer;
}

/**
 * Grava quatro caracteres ASCII no DataView.
 *
 * @param view Buffer de destino.
 * @param offset Índice inicial.
 * @param text Quatro letras do chunk WAV.
 */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}
