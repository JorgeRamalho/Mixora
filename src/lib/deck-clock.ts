/**
 * Relógio do visor Rekordbox: `00:03.7` ou `-00:03.7` no restante.
 *
 * @param sec Segundos decorridos ou restantes, já na unidade de parede.
 * @param remaining Quando true, prefixa o sinal de restante.
 */
export function formatDeckClock(sec: number, remaining = false): string {
  const abs = Number.isFinite(sec) ? Math.max(0, sec) : 0;
  const mins = Math.floor(abs / 60);
  const rem = abs - mins * 60;
  const whole = Math.floor(rem);
  const tenths = Math.min(9, Math.floor((rem - whole) * 10));
  const body = `${mins.toString().padStart(2, "0")}:${whole.toString().padStart(2, "0")}.${tenths}`;
  return remaining ? `-${body}` : body;
}
