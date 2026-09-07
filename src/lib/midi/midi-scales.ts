/**
 * Escalas que ligam o valor decodificado da DDJ-400 ao range da cabine.
 *
 * O `ddj-400-protocol.ts` conhece o hardware e devolve unitário ou bipolar, ao
 * passo que aqui mora o range de destino de cada controle, a saber trim em
 * 0.2–1, EQ em −24 a +12 dB, filter em −100 a 100 e pitch em ±8%. A separação
 * importa porque trocar a sensibilidade de um knob da cabine **não** é mexer no
 * endereçamento MIDI, e o contrário também vale.
 *
 * A decimação do jog vive aqui pela mesma razão, porque quantos ticks valem um
 * `nudge` é sensação de prato, e não protocolo.
 */

import { bipolarUnit14Bit, tempoToBipolarUnit, unit14Bit } from "./ddj-400-protocol";

const TRIM_MIN = 0.2;
const TRIM_SPAN = 0.8;
const EQ_CUT_DB = 24;
const EQ_BOOST_DB = 12;
const FILTER_RANGE = 100;
const PITCH_RANGE = 8;

/**
 * Casas decimais dos controles unitários de 0 a 1.
 *
 * Três casas dão mil degraus, ao passo que duas dariam cem, ou seja, menos que
 * os 128 de um CC de 7 bits. Com duas casas o par MSB/LSB não compraria
 * resolução nenhuma nesses controles, e o esforço de 14 bits seria jogado fora
 * no arredondamento.
 */
const UNIT_DECIMALS = 3;

/** Casas decimais de EQ em dB e de filter, cujas escalas já são amplas. */
const WIDE_DECIMALS = 1;

/**
 * Casas decimais do pitch.
 *
 * A tela mostra uma casa, mas o valor guarda duas, porque o `effectiveBpm`
 * mostra duas casas e um pitch grosso travaria o BPM em degraus visíveis.
 */
const PITCH_DECIMALS = 2;

/**
 * Ticks de jog que valem um `nudge`, medidos numa DDJ-400 real.
 *
 * Uma volta completa manda 750 ticks, e cada `nudge` desloca 0.035 de `phase`
 * no modo vinyl, que o engine divide em 8 batidas. Por isso 26 ticks fazem uma
 * volta encostada deslocar a faixa inteira, que é a sensação de scratch.
 *
 * A roda solta pede quatro vezes mais gesto porque ela é bend, e não arrasto,
 * de modo que uma volta livre desloca dois tempos. O que separa os dois casos é
 * o número do CC, que na DDJ-400 informa o toque e não o lugar da roda.
 */
export const JOG_TICKS_PER_NUDGE = { touched: 26, free: 104 } as const;

/**
 * Normaliza um controle unitário de 14 bits para 0 a 1.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function scaleUnit(msb: number, lsb: number): number {
  return roundTo(unit14Bit(msb, lsb), UNIT_DECIMALS);
}

/**
 * Leva um controle unitário para o range de trim da cabine, 0.2 a 1.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function scaleTrim(msb: number, lsb: number): number {
  return roundTo(TRIM_MIN + unit14Bit(msb, lsb) * TRIM_SPAN, UNIT_DECIMALS);
}

/**
 * Leva um knob de EQ para dB, com corte mais fundo que o boost.
 *
 * A escala é **assimétrica** porque o range da cabine vai de −24 a +12 mas o
 * neutro é 0 dB, já que o valor entra direto no `gain` do biquad. Um fator
 * único faria o detent do knob cair em −6 dB.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function scaleEqDb(msb: number, lsb: number): number {
  const bipolar = bipolarUnit14Bit(msb, lsb);
  return roundTo(bipolar < 0 ? bipolar * EQ_CUT_DB : bipolar * EQ_BOOST_DB, WIDE_DECIMALS);
}

/**
 * Leva o knob de filter para o range da cabine, −100 a 100, com bypass no zero.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function scaleFilter(msb: number, lsb: number): number {
  return roundTo(bipolarUnit14Bit(msb, lsb) * FILTER_RANGE, WIDE_DECIMALS);
}

/**
 * Leva o tempo fader para o pitch da cabine, −8% a +8%.
 *
 * Usa `tempoToBipolarUnit`, e **não** `bipolarUnit14Bit`, porque o fader é
 * invertido, ou seja, o topo manda 0 e portanto o topo é +8%.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function scalePitch(msb: number, lsb: number): number {
  return roundTo(tempoToBipolarUnit(msb, lsb) * PITCH_RANGE, PITCH_DECIMALS);
}

/**
 * Decide se um acumulador de ticks de jog já rendeu um `nudge`.
 *
 * O prato **não** informa velocidade na magnitude, porque o delta é sempre ±1,
 * e sim na taxa, que vai de um tick a cada 14 ms no giro lento até um a cada
 * 1,8 ms no rápido. Por isso o mapper decima em vez de comparar com limiar, e
 * o resto volta para o acumulador para o gesto não perder ticks.
 *
 * @param accumulated Soma com sinal dos ticks ainda não convertidos.
 * @param divisor Quantos ticks valem um `nudge`, conforme `JOG_TICKS_PER_NUDGE`.
 * @returns Direção do `nudge`, ou zero quando ainda não deu, e o resto a guardar.
 */
export function takeJogNudge(
  accumulated: number,
  divisor: number,
): { direction: -1 | 0 | 1; rest: number } {
  if (Math.abs(accumulated) < divisor) return { direction: 0, rest: accumulated };
  const direction = accumulated > 0 ? 1 : -1;
  return { direction, rest: accumulated - direction * divisor };
}

/**
 * Arredonda para um número de casas decimais, para o knob da tela não oscilar
 * em frações longas.
 *
 * A conta multiplica antes e divide depois, e **não** o contrário, porque
 * `Math.round(x / 0.001) * 0.001` devolveria 0.6000000000000001 em vez de 0.6,
 * e o valor vazaria com ruído de ponto flutuante para o snapshot e para os
 * testes de mapa.
 *
 * @param value Valor já na escala de destino.
 * @param decimals Casas a preservar.
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
