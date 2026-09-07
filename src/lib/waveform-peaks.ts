/**
 * Extrai picos de amplitude por bin, para a waveform tipo CDJ.
 *
 * @param buffer Buffer decodificado.
 * @param binCount Quantidade de barras. Padrão 512.
 */
export function computePeaks(buffer: AudioBuffer, binCount = 512): Float32Array {
  const peaks = new Float32Array(binCount);
  const data = buffer.getChannelData(0);
  const samplesPerBin = Math.max(1, Math.floor(data.length / binCount));
  for (let bin = 0; bin < binCount; bin += 1) {
    let max = 0;
    const start = bin * samplesPerBin;
    const end = Math.min(data.length, start + samplesPerBin);
    for (let sample = start; sample < end; sample += 1) {
      const value = Math.abs(data[sample] ?? 0);
      if (value > max) max = value;
    }
    peaks[bin] = max;
  }
  return peaks;
}
