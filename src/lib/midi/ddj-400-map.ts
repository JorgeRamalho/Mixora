/**
 * Traduz mensagens da DDJ-400 em `MixerAction` da cabine.
 *
 * Cobre os knobs e faders analógicos de 14 bits, a saber trim, EQ, filter,
 * channel fader, crossfader, os dois knobs de fone e o tempo fader, mais as
 * notes de transporte, os pads de hot cue, os jogs e a seção de browser.
 * Os bytes vêm de `ddj-400-protocol.ts` e os ranges de destino de
 * `midi-scales.ts`, de modo que este arquivo só decide **qual** controle é.
 */

import { HOT_CUE_SLOTS } from "../../types/mixer";
import type { DeckId, MixerAction } from "../../types/mixer";
import type { ParsedMidiMessage } from "./parse-message";
import {
  BROWSER_NOTE,
  DDJ_STATUS,
  DECK_CC_14BIT,
  DECK_CC_JOG,
  DECK_NOTE,
  deckFromStatus,
  encoderDelta,
  HOT_CUE_FIRST_NOTE,
  isPress,
  isRelease,
  jogDelta,
  MIXER_CC_14BIT,
  MIXER_CC_BROWSE,
  type Cc14Bit,
} from "./ddj-400-protocol";
import {
  JOG_TICKS_PER_NUDGE,
  scaleEqDb,
  scaleFilter,
  scalePitch,
  scaleTrim,
  scaleUnit,
  takeJogNudge,
} from "./midi-scales";

interface Cc14Parts {
  readonly msb: number;
  readonly lsb: number;
}

export interface Ddj400MapContext {
  /** Último par MSB/LSB de cada controle de 14 bits, por canal. */
  last14: Map<string, Cc14Parts>;
  /** Ticks de jog ainda não convertidos em `nudge`, por deck e estado de toque. */
  jogTicks: Map<string, number>;
}

/**
 * Cria o contexto mutável do mapper, que guarda o que uma mensagem sozinha não
 * carrega, a saber o par 14-bit pendente e o resto do gesto de jog.
 */
export function createDdj400MapContext(): Ddj400MapContext {
  return { last14: new Map(), jogTicks: new Map() };
}

/**
 * Mapeia uma mensagem já parseada para uma ação da cabine, ou `null` quando o
 * controle ainda não pertence a este mapa.
 *
 * @param event Mensagem CC ou note já quebrada pelo parser genérico.
 * @param ctx Estado do mapper entre mensagens.
 */
export function mapDdj400(event: ParsedMidiMessage, ctx: Ddj400MapContext): MixerAction | null {
  if (event.kind === "noteOn") {
    if (event.status === DDJ_STATUS.noteDeckA || event.status === DDJ_STATUS.noteDeckB) {
      return mapDeckNote(event);
    }
    if (event.status === DDJ_STATUS.notePadDeckA || event.status === DDJ_STATUS.notePadDeckB) {
      return mapPadNote(event);
    }
    if (event.status === DDJ_STATUS.noteBrowser) {
      return mapBrowserNote(event);
    }
    return null;
  }
  if (event.kind !== "cc") return null;

  if (event.status === DDJ_STATUS.ccDeckA || event.status === DDJ_STATUS.ccDeckB) {
    return mapDeckCc(event, ctx);
  }
  if (event.status === DDJ_STATUS.ccMixer) {
    // O encoder é resolvido antes da tabela de 14 bits porque ele divide o
    // canal com o crossfader e os knobs de fone, mas não é um par MSB/LSB, e
    // deixá-lo cair no `matchCc14` faria o passo relativo ser lido como metade
    // de um valor absoluto.
    if (event.data1 === MIXER_CC_BROWSE) {
      return { type: "browseMove", delta: encoderDelta(event.data2) };
    }
    return mapMixerAnalog(event, ctx);
  }
  return null;
}

/**
 * Resolve LOAD e BACK, que moram num canal sem deck.
 *
 * Esta é a única seção em que o deck sai do **número da note**, e não do canal,
 * porque as duas notes de LOAD chegam sob `DDJ_STATUS.noteBrowser`. Por isso
 * `deckFromStatus` devolve `null` aqui e não serve de nada.
 *
 * As duas ações de LOAD são intenção: o mapper diz qual deck recebe o arquivo,
 * e o dispatcher abre o seletor de áudio daquele deck.
 *
 * @param event Note On no canal do browser.
 */
function mapBrowserNote(event: ParsedMidiMessage): MixerAction | null {
  if (!isPress(event.data2)) return null;

  switch (event.data1) {
    case BROWSER_NOTE.load.a:
      return { type: "browseLoad", id: "a" };
    case BROWSER_NOTE.load.b:
      return { type: "browseLoad", id: "b" };
    case BROWSER_NOTE.back:
      return { type: "browseHome" };
    default:
      return null;
  }
}

/**
 * Resolve os botões de transporte e o toque do prato.
 *
 * Só o press vira ação, porque a DDJ-400 **não** manda Note Off de status
 * `0x80`, e sim um segundo Note On com velocity zero ao soltar; sem esse filtro
 * o play dispararia duas vezes por toque.
 *
 * O `DECK_NOTE.jogTouch` chega aqui e sai sem ação de propósito, porque o
 * número do CC da roda já informa o toque, e guardar o flag seria estado morto.
 *
 * As ações de sync, PFL e cue saem sem `value`, ou seja, são intenção, porque a
 * controladora informa o gesto e não o estado de destino. Quem lê o snapshot e
 * decide é o reducer.
 *
 * @param event Note On no canal do deck A ou B.
 */
function mapDeckNote(event: ParsedMidiMessage): MixerAction | null {
  const deck = deckFromStatus(event.status);
  if (!deck) return null;

  if (event.data1 === DECK_NOTE.cue) {
    if (isPress(event.data2)) return { type: "cuePress", id: deck };
    if (isRelease(event.data2)) return { type: "cueRelease", id: deck };
    return null;
  }

  if (!isPress(event.data2)) return null;

  switch (event.data1) {
    case DECK_NOTE.play:
      return { type: "toggle", id: deck };
    case DECK_NOTE.pfl:
      return { type: "toggleCueMonitor", id: deck };
    case DECK_NOTE.sync:
      return { type: "toggleSync", id: deck };
    case DECK_NOTE.syncLong:
      // Note distinta que o firmware emite ao segurar o SYNC, e por isso o
      // mapper não precisa de timer para separar toque curto de longo.
      return { type: "masterDeck", id: deck };
    case DECK_NOTE.loopIn:
      return { type: "loopOn", id: deck };
    case DECK_NOTE.loopOut:
      return { type: "loopOff", id: deck };
    case DECK_NOTE.reloop:
      return { type: "toggleLoop", id: deck };
    default:
      return null;
  }
}

/**
 * Resolve os pads de um deck, que têm canal próprio.
 *
 * O mapper **não** rastreia em que modo os pads estão, e essa é a boa notícia
 * desta faixa: a controladora resolve o modo no hardware e manda uma note
 * distinta para cada um, de modo que o pad 1 sai como `0x00` em Hot Cue mas
 * como `0x60` em Beat Loop. Filtrar a faixa que começa em `HOT_CUE_FIRST_NOTE`
 * já descarta os outros modos sozinho, sem estado e sem escutar os botões de
 * modo, pelo mesmo princípio que dispensou o SHIFT na onda 3.
 *
 * O hardware tem oito pads por deck, ao passo que o engine só tem quatro slots
 * de hot cue, e por isso as quatro notes de cima saem como `null` em vez de
 * pedirem um slot que não existe.
 *
 * @param event Note On no canal de pads do deck A ou B.
 */
function mapPadNote(event: ParsedMidiMessage): MixerAction | null {
  const deck = deckFromStatus(event.status);
  if (!deck || !isPress(event.data2)) return null;

  const index = event.data1 - HOT_CUE_FIRST_NOTE;
  if (index < 0 || index >= HOT_CUE_SLOTS) return null;

  return { type: "hotCuePad", id: deck, slot: index + 1 };
}

/**
 * Separa os CCs do canal do deck entre jog relativo e controle de 14 bits.
 *
 * @param event CC no canal do deck A ou B.
 * @param ctx Estado do mapper entre mensagens.
 */
function mapDeckCc(event: ParsedMidiMessage, ctx: Ddj400MapContext): MixerAction | null {
  const deck = deckFromStatus(event.status);
  if (!deck) return null;

  if (event.data1 === DECK_CC_JOG.touched || event.data1 === DECK_CC_JOG.free) {
    return mapJog(event, ctx, deck);
  }
  return mapDeckAnalog(event, ctx, deck);
}

/**
 * Converte os ticks da roda em `nudge`, decimando em vez de comparar limiar.
 *
 * O próprio número do CC diz se a roda girou encostada ou solta, e por isso o
 * mapper **não** precisa consultar o `jogTouch`: um gesto encostado é scratch e
 * pede 26 ticks por `nudge`, ao passo que a roda livre é bend e pede 104.
 *
 * O mapper também **não** deduz `jogMode` daqui, embora o mapa do Mixxx separe
 * um CC de prato vinyl de um de prato CDJ, porque a DDJ-400 não tem chave VINYL
 * e o segundo número nunca chega. Deduzir modo faria encostar no prato atropelar
 * a escolha feita na tela.
 *
 * Os dois acumuladores são separados por deck e por estado de toque, senão o
 * resto de um gesto de scratch entraria na conta do bend seguinte com o peso
 * errado.
 *
 * @param event CC de jog no canal do deck.
 * @param ctx Estado do mapper entre mensagens.
 * @param deck Deck resolvido pelo canal MIDI.
 */
function mapJog(
  event: ParsedMidiMessage,
  ctx: Ddj400MapContext,
  deck: DeckId,
): MixerAction | null {
  const touched = event.data1 === DECK_CC_JOG.touched;
  const key = `${deck}:${touched ? "touched" : "free"}`;
  const divisor = touched ? JOG_TICKS_PER_NUDGE.touched : JOG_TICKS_PER_NUDGE.free;

  const { direction, rest } = takeJogNudge(
    (ctx.jogTicks.get(key) ?? 0) + jogDelta(event.data2),
    divisor,
  );
  ctx.jogTicks.set(key, rest);
  return direction === 0 ? null : { type: "nudge", id: deck, direction };
}

/**
 * Resolve trim, EQ, channel fader e tempo, cujo deck sai do canal MIDI.
 *
 * @param event CC de 14 bits no canal do deck.
 * @param ctx Estado do mapper entre mensagens.
 * @param deck Deck resolvido pelo canal MIDI.
 */
function mapDeckAnalog(
  event: ParsedMidiMessage,
  ctx: Ddj400MapContext,
  deck: DeckId,
): MixerAction | null {
  const match = matchCc14(DECK_CC_14BIT, event.data1);
  if (!match) return null;

  const { msb, lsb } = assemble14Bit(ctx, event.status, match.pair, match.part, event.data2);
  switch (match.name) {
    case "channelFader":
      return { type: "gain", id: deck, value: scaleUnit(msb, lsb) };
    case "trim":
      return { type: "trim", id: deck, value: scaleTrim(msb, lsb) };
    case "tempo":
      return { type: "pitch", id: deck, value: scalePitch(msb, lsb) };
    case "eqHigh":
      return { type: "eq", id: deck, band: "high", value: scaleEqDb(msb, lsb) };
    case "eqMid":
      return { type: "eq", id: deck, band: "mid", value: scaleEqDb(msb, lsb) };
    case "eqLow":
      return { type: "eq", id: deck, band: "low", value: scaleEqDb(msb, lsb) };
    default:
      return null;
  }
}

/**
 * Resolve crossfader, filtros e knobs de fone, que moram no canal do mixer.
 *
 * @param event CC no status `DDJ_STATUS.ccMixer`.
 * @param ctx Estado do mapper entre mensagens.
 */
function mapMixerAnalog(event: ParsedMidiMessage, ctx: Ddj400MapContext): MixerAction | null {
  const match = matchCc14(MIXER_CC_14BIT, event.data1);
  if (!match) return null;

  const { msb, lsb } = assemble14Bit(ctx, event.status, match.pair, match.part, event.data2);
  switch (match.name) {
    case "crossfader":
      return { type: "xf", value: scaleUnit(msb, lsb) };
    case "filterDeckA":
      return { type: "filter", id: "a", value: scaleFilter(msb, lsb) };
    case "filterDeckB":
      return { type: "filter", id: "b", value: scaleFilter(msb, lsb) };
    case "headphonesMixing":
      return { type: "cueMix", value: scaleUnit(msb, lsb) };
    case "headphonesLevel":
      return { type: "booth", value: scaleUnit(msb, lsb) };
    default:
      return null;
  }
}

/**
 * Junta MSB e LSB sem pular o valor quando só um dos dois bytes chega.
 *
 * O último LSB conhecido entra na conta do MSB novo, e o contrário também, e
 * por isso o knob da tela não salta para o coarse de LSB zero a cada giro.
 *
 * @param ctx Estado do mapper entre mensagens.
 * @param status Canal MIDI, porque o mesmo CC no deck A e no B são controles distintos.
 * @param pair Endereço 14-bit do protocolo.
 * @param part Qual byte desta mensagem.
 * @param value Byte de 0 a 127.
 */
function assemble14Bit(
  ctx: Ddj400MapContext,
  status: number,
  pair: Cc14Bit,
  part: "msb" | "lsb",
  value: number,
): Cc14Parts {
  const key = `${status}:${pair.msb}`;
  const previous = ctx.last14.get(key) ?? { msb: 0, lsb: 0 };
  const next = part === "msb" ? { msb: value, lsb: previous.lsb } : { msb: previous.msb, lsb: value };
  ctx.last14.set(key, next);
  return next;
}

/**
 * Descobre se o número do CC é o MSB ou o LSB de um par conhecido.
 *
 * @param table Tabela de pares do protocolo.
 * @param cc Segundo byte da mensagem.
 */
function matchCc14(
  table: Record<string, Cc14Bit>,
  cc: number,
): { name: string; pair: Cc14Bit; part: "msb" | "lsb" } | null {
  for (const [name, pair] of Object.entries(table)) {
    if (cc === pair.msb) return { name, pair, part: "msb" };
    if (cc === pair.lsb) return { name, pair, part: "lsb" };
  }
  return null;
}
