import type { CSSProperties } from "react";

/**
 * Prende um valor numérico entre min e max.
 *
 * @param value Valor bruto.
 * @param min Limite inferior.
 * @param max Limite superior.
 */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Variáveis CSS para preencher a trilha do crossfader da esquerda até o thumb.
 *
 * @param value Posição do crossfader de 0 a 1.
 */
export function crossfaderSliderStyle(value: number): CSSProperties {
  const pct = clamp(value, 0, 1) * 100;
  return { "--range-pct": `${pct}%` } as CSSProperties;
}

/**
 * Variáveis CSS para preencher o pitch do detent central até o thumb.
 *
 * @param inputValue Valor do input range, invertido em relação ao pitch exibido.
 * @param min Limite inferior do pitch fader.
 * @param max Limite superior do pitch fader.
 */
export function pitchSliderStyle(
  inputValue: number,
  min = -8,
  max = 8,
): CSSProperties {
  const span = max - min;
  const pct = span === 0 ? 50 : ((inputValue - min) / span) * 100;
  const clamped = clamp(pct, 0, 100);
  const center = span === 0 ? 50 : ((0 - min) / span) * 100;
  return {
    "--range-pct": `${clamped}%`,
    "--fill-start": `${Math.min(center, clamped)}%`,
    "--fill-end": `${Math.max(center, clamped)}%`,
    "--range-center": `${center}%`,
  } as CSSProperties;
}
