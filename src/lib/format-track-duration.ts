/**
 * Formata duração em milissegundos para o padrão Rekordbox `m:ss`.
 *
 * @param durationMs Duração da faixa, ou null quando ausente.
 */
export function formatTrackDuration(durationMs: number | null | undefined): string {
  if (durationMs === null || durationMs === undefined || durationMs < 0) return "—";
  const totalSec = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Converte texto `m:ss` em milissegundos.
 *
 * @param duration Texto de duração.
 */
export function parseDurationText(duration: string): number | null {
  const match = /^(\d+):(\d{2})$/.exec(duration.trim());
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000;
}
