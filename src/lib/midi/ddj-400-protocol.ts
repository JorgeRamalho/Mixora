/**
 * Endereçamento MIDI da Pioneer DDJ-400 e decodificação do protocolo.
 *
 * Os bytes e as escalas de decodificação vêm do mapa oficial do Mixxx
 * (`Pioneer-DDJ-400.midi.xml` e `Pioneer-DDJ-400-script.js`), lido como
 * referência e não redistribuído aqui, porque o Mixxx é GPL v2. As escalas de
 * destino da cabine, como trim em 0.2–1 e eq em −24 a +12, ficam no mapper que
 * traduz para `MixerAction`, e não neste arquivo.
 */

import type { DeckId } from "../../types/mixer";

/** Par MSB/LSB de um controle de 14 bits, onde o LSB é sempre `msb + 0x20`. */
export interface Cc14Bit {
  readonly msb: number;
  readonly lsb: number;
}

/**
 * Status bytes por seção da controladora.
 *
 * Na maior parte do mapa o deck sai do canal, e não do número do CC, ou seja,
 * o mesmo par de CCs no status `0xB0` é deck A e no status `0xB1` é deck B.
 * O filtro é a exceção, porque os dois moram no canal do mixer.
 */
export const DDJ_STATUS = {
  noteDeckA: 0x90,
  noteDeckB: 0x91,
  ccDeckA: 0xb0,
  ccDeckB: 0xb1,
  ccMixer: 0xb6,
  noteBrowser: 0x96,
  notePadDeckA: 0x97,
  notePadDeckB: 0x99,
} as const;

/**
 * Seção de browser, que tem canal próprio e não pertence a nenhum deck.
 *
 * O LOAD indica o deck pelo número da note, e não pelo canal, porque as duas
 * notes chegam sob `DDJ_STATUS.noteBrowser`. O BACK é o clique do encoder, que
 * o mapa do Mixxx descreve como alternância entre lista e árvore.
 */
export const BROWSER_NOTE = {
  back: 0x41,
  load: { a: 0x46, b: 0x47 },
} as const;

/** Encoder BROWSE, que gira no canal do mixer com passo relativo de 7 bits. */
export const MIXER_CC_BROWSE = 0x40;

/** Controles de 14 bits que existem nos dois decks, endereçados pelo canal. */
export const DECK_CC_14BIT = {
  channelFader: { msb: 0x13, lsb: 0x33 },
  trim: { msb: 0x04, lsb: 0x24 },
  eqHigh: { msb: 0x07, lsb: 0x27 },
  eqMid: { msb: 0x0b, lsb: 0x2b },
  eqLow: { msb: 0x0f, lsb: 0x2f },
  tempo: { msb: 0x00, lsb: 0x20 },
} as const satisfies Record<string, Cc14Bit>;

/**
 * Controles de 14 bits do canal do mixer (`0xB6`).
 *
 * Aqui o deck do filtro sai do número do CC, porque os dois filtros
 * compartilham o mesmo canal.
 */
export const MIXER_CC_14BIT = {
  crossfader: { msb: 0x1f, lsb: 0x3f },
  filterDeckA: { msb: 0x17, lsb: 0x37 },
  filterDeckB: { msb: 0x18, lsb: 0x38 },
  headphonesMixing: { msb: 0x0c, lsb: 0x2c },
  headphonesLevel: { msb: 0x0d, lsb: 0x2d },
} as const satisfies Record<string, Cc14Bit>;

/**
 * Jog, que manda CC relativo de 7 bits no canal do deck.
 *
 * Os dois números **não** são dois lugares da roda, e sim o mesmo giro em dois
 * estados de toque, o que uma medição na controladora provou: uma volta com o
 * dedo no topo rendeu 752 ticks em `touched` e nenhum em `free`, ao passo que
 * uma volta com a roda solta rendeu o contrário. Um sensor separado de borda
 * teria registrado as duas voltas, já que a roda é peça única.
 *
 * O mapa do Mixxx ainda lista um terceiro CC, `0x23`, que ele chama de prato em
 * modo CDJ. Ele **nunca** chegou nesta unidade, e por isso não vira constante
 * aqui: a DDJ-400 não tem chave VINYL, e quem escolhe o tamanho do bump é o
 * `jogMode` da cabine.
 */
export const DECK_CC_JOG = {
  touched: 0x22,
  free: 0x21,
} as const;

/**
 * Notes de transporte e loop, endereçadas pelo canal do deck.
 *
 * O `shift` fica aqui só como endereço, e não como estado a guardar, porque a
 * controladora resolve as combinações no hardware e manda uma note própria para
 * cada uma, como 0x47 para PLAY+SHIFT e 0x60 para SYNC+SHIFT.
 */
export const DECK_NOTE = {
  play: 0x0b,
  cue: 0x0c,
  loopIn: 0x10,
  loopOut: 0x11,
  reloop: 0x4d,
  jogTouch: 0x36,
  shift: 0x3f,
  pfl: 0x54,
  sync: 0x58,
  syncLong: 0x5c,
} as const;

/** Primeira note do modo Hot Cue, já que os pads ocupam notes consecutivas. */
export const HOT_CUE_FIRST_NOTE = 0x00;

/** Pads por deck no hardware. O engine só tem 4 slots de hot cue. */
export const PAD_COUNT = 8;

/**
 * Velocity mínima que conta como press.
 *
 * A DDJ-400 não manda Note Off de status 0x80, e sim um segundo Note On com
 * velocity 0x00 no release, ou seja, qualquer velocity acima de zero é press.
 * O limiar fica em 64 por segurança, embora o hardware só use 0x7F e 0x00.
 */
export const PRESS_VELOCITY = 64;

/** Multiplicador do pitch bend do jog, equivalente ao `bendScale` do Mixxx. */
export const JOG_BEND_SCALE = 0.8;

/** Multiplicador do seek rápido com SHIFT, equivalente ao `fastSeekScale`. */
export const JOG_FAST_SEEK_SCALE = 150;

/** Fim de curso de um controle de 14 bits. */
const CC_14BIT_MAX = 0x3fff;

/** Valor que o tempo fader manda no detent central. */
const CC_14BIT_CENTER = 0x2000;

/** Valor que o encoder do jog manda parado. */
const JOG_CENTER = 0x40;

/** Bit de sinal de um passo relativo de 7 bits. */
const ENCODER_SIGN_BIT = 0x40;

/** Faixa completa de um valor de 7 bits com sinal. */
const ENCODER_RANGE = 0x80;

/**
 * Prende um valor no intervalo bipolar de −1 a 1.
 *
 * O detent central não fica exatamente no meio do curso, porque o lado positivo
 * tem um passo a menos que o negativo, e por isso o fim de curso estoura a
 * unidade por uma fração.
 *
 * @param value Valor bruto já normalizado em torno do centro.
 */
function clampBipolar(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Junta o par MSB/LSB num único inteiro de 14 bits.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 * @returns Valor de 0 a 0x3FFF.
 */
export function combine14Bit(msb: number, lsb: number): number {
  return (msb << 7) | lsb;
}

/**
 * Normaliza um controle de 14 bits para 0 a 1, que é o range dos faders e dos
 * knobs de monitor da cabine.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function unit14Bit(msb: number, lsb: number): number {
  return combine14Bit(msb, lsb) / CC_14BIT_MAX;
}

/**
 * Normaliza um knob com detent central para −1 a 1, com zero no detent.
 *
 * Serve para FILTER e para as três bandas de EQ, que na cabine são bipolares em
 * torno do neutro, ou seja, filter zero é bypass e eq zero é 0 dB. Usar
 * `unit14Bit` nesses knobs devolveria 0.5 no detent, e o mapper teria de
 * recentrar por conta própria, repetindo o valor do centro que só este arquivo
 * deve conhecer.
 *
 * Diferente de `tempoToBipolarUnit`, aqui a conta **não** inverte, porque o
 * knob cresce no mesmo sentido do valor da UI.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function bipolarUnit14Bit(msb: number, lsb: number): number {
  return clampBipolar(combine14Bit(msb, lsb) / CC_14BIT_CENTER - 1);
}

/**
 * Converte o tempo fader num valor bipolar de −1 a 1, com zero no detent.
 *
 * O fader é invertido, porque o topo manda 0 e o fundo manda 0x3FFF, e por isso
 * a conta subtrai em vez de somar. Além disso o divisor é o centro 0x2000, e
 * não o máximo 0x3FFF, senão o detent marcaria metade do range em vez de zero.
 * Quem multiplica pelo range de pitch da UI é o mapper.
 *
 * @param msb Byte mais significativo, de 0 a 127.
 * @param lsb Byte menos significativo, de 0 a 127.
 */
export function tempoToBipolarUnit(msb: number, lsb: number): number {
  return clampBipolar(1 - combine14Bit(msb, lsb) / CC_14BIT_CENTER);
}

/**
 * Converte um CC de jog no delta relativo com sinal.
 *
 * @param value Byte do CC, de 0 a 127, com repouso em 0x40.
 * @returns Negativo para rewind, positivo para forward e zero parado.
 */
export function jogDelta(value: number): number {
  return value - JOG_CENTER;
}

/**
 * Converte o encoder BROWSE no passo relativo com sinal.
 *
 * O BROWSE **não** usa a mesma codificação do jog. Enquanto o prato descansa em
 * `0x40` e o sinal vem da distância até esse centro, o encoder manda complemento
 * de dois em 7 bits, ou seja, `0x01` é um passo à frente e `0x7F` é um passo
 * atrás. Passar este valor por `jogDelta` devolveria −63 a cada clique.
 *
 * @param value Byte do CC, de 0 a 127.
 * @returns Positivo ao girar para frente e negativo ao girar para trás.
 */
export function encoderDelta(value: number): number {
  return value < ENCODER_SIGN_BIT ? value : value - ENCODER_RANGE;
}

/**
 * Diz se um Note On é press, que é o evento que dispara ação.
 *
 * @param velocity Terceiro byte da mensagem, de 0 a 127.
 */
export function isPress(velocity: number): boolean {
  return velocity >= PRESS_VELOCITY;
}

/**
 * Diz se um Note On é o release, que a controladora manda com velocity zero.
 *
 * Quase todo botão descarta o release, senão play dispara duas vezes. A exceção
 * é o `DECK_NOTE.jogTouch`, que é momentâneo e precisa justamente deste evento
 * para soltar o flag do prato.
 *
 * @param velocity Terceiro byte da mensagem, de 0 a 127.
 */
export function isRelease(velocity: number): boolean {
  return velocity === 0;
}

/**
 * Descobre o deck a partir do status byte, porque na maior parte do mapa o deck
 * é o canal MIDI.
 *
 * @param status Primeiro byte da mensagem.
 * @returns O deck, ou `null` quando o status é do mixer ou desconhecido, caso
 * em que o endereço do deck sai do número do CC, como acontece no filtro.
 */
export function deckFromStatus(status: number): DeckId | null {
  if (status === DDJ_STATUS.noteDeckA || status === DDJ_STATUS.ccDeckA) return "a";
  if (status === DDJ_STATUS.noteDeckB || status === DDJ_STATUS.ccDeckB) return "b";
  if (status === DDJ_STATUS.notePadDeckA) return "a";
  if (status === DDJ_STATUS.notePadDeckB) return "b";
  return null;
}
