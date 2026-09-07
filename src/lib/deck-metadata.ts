import { normalizeCamelotCode } from "./musical-key";

/**
 * Lê BPM no nome do arquivo, por exemplo `kick-120bpm.mp3`.
 *
 * Sem match devolve `undefined`, e o caller usa o BPM que o deck já tinha
 * ou 120.
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

const CAMELOT_FILENAME_PATTERNS = [
  /\((\d{1,2}[AB])\)/i,
  /\[(\d{1,2}[AB])\]/i,
  /\b(\d{1,2}[AB])\b/i,
] as const;

/**
 * Extrai o código Camelot do nome do arquivo, por exemplo `04. (6B) glacial - scuba.mp3`.
 *
 * @param filename Nome do arquivo, com ou sem caminho.
 */
export function parseCamelotFromFilename(filename: string): string | undefined {
  const base = filename.replace(/^.*[\\/]/, "");
  for (const pattern of CAMELOT_FILENAME_PATTERNS) {
    const match = base.match(pattern);
    if (!match?.[1]) continue;
    const normalized = normalizeCamelotCode(match[1]);
    if (normalized) return normalized;
  }
  return undefined;
}
