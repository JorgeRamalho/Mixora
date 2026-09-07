/**
 * Lê BPM no nome do arquivo, por exemplo `kick-120bpm.mp3`.
 *
 * Sem match devolve `undefined`, e o caller usa o BPM que o deck já tinha
 * ou 120. KEY não mora no nome: a tela mostra "—" até o aluno preencher.
 *
 * @param filename Nome do arquivo, com ou sem caminho.
 */
export function parseBpmFromFilename(filename: string): number | undefined {
  const match = filename.match(/(\d{2,3})\s*bpm/i);
  if (!match?.[1]) return undefined;
  const bpm = Number(match[1]);
  if (bpm < 60 || bpm > 220) return undefined;
  return bpm;
}

/**
 * Título a partir do nome do arquivo, sem extensão.
 *
 * @param filename Nome cru do `File`.
 */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").trim();
  return base || "Faixa sem título";
}
