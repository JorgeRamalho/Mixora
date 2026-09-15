/**
 * Gera preview compacto estável para a listagem da collection.
 *
 * @param seed Valor numérico que fixa a forma da onda.
 * @param points Quantidade de amostras no preview.
 */
export function synthesizeWaveformPreview(seed: number, points = 48): number[] {
  return Array.from({ length: points }, (_, index) => {
    const phase = (index / points) * Math.PI * 4 + (seed % 97) * 0.01;
    return 0.15 + Math.abs(Math.sin(phase)) * 0.75;
  });
}
