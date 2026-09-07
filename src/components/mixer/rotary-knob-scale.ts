function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Diz se o curso tem detent no zero, como EQ e filter.
 *
 * @param min Limite esquerdo do knob.
 * @param max Limite direito do knob.
 */
function isBipolarRange(min: number, max: number) {
  return min < 0 && max > 0;
}

/**
 * Posição visual 0–1 do ponteiro. Com range bipolar, o zero fica no meio do
 * arco, e não no 67% que a escala linear de −24 a +12 produziria.
 *
 * @param value Valor na escala do engine.
 * @param min Limite esquerdo.
 * @param max Limite direito.
 */
export function visualNorm(value: number, min: number, max: number) {
  const clamped = clamp(value, min, max);
  if (isBipolarRange(min, max)) {
    if (clamped < 0) return (0.5 * (clamped - min)) / (0 - min);
    return 0.5 + (0.5 * clamped) / max;
  }
  if (max === min) return 0;
  return (clamped - min) / (max - min);
}

/**
 * Inverte `visualNorm` para o arraste e o input range.
 *
 * @param norm Fração 0–1 do arco.
 * @param min Limite esquerdo.
 * @param max Limite direito.
 */
export function valueFromVisualNorm(norm: number, min: number, max: number) {
  const n = clamp(norm, 0, 1);
  if (isBipolarRange(min, max)) {
    if (n < 0.5) return min + (n / 0.5) * (0 - min);
    return ((n - 0.5) / 0.5) * max;
  }
  return min + n * (max - min);
}

/**
 * Percentual do arco do knob, com 50% no detent quando min é negativo e max positivo.
 *
 * @param value Valor na escala do engine.
 * @param min Limite esquerdo.
 * @param max Limite direito.
 */
export function formatKnobPercent(value: number, min: number, max: number) {
  return `${Math.round(visualNorm(value, min, max) * 100)}%`;
}

/**
 * Prende o valor no passo da UI.
 *
 * @param value Valor bruto.
 * @param min Limite esquerdo.
 * @param max Limite direito.
 * @param step Incremento do knob.
 */
export function snapKnobValue(value: number, min: number, max: number, step: number) {
  const steps = Math.round((clamp(value, min, max) - min) / step);
  return clamp(min + steps * step, min, max);
}
