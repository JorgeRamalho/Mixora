/**
 * Quebra um `Uint8Array` da Web MIDI em status, CC ou note.
 *
 * Este arquivo é genérico e por isso **não** importa o protocolo da DDJ-400.
 * Reconhecer o controle é trabalho do mapper.
 */

const STATUS_CLASS_MASK = 0xf0;
const CHANNEL_MASK = 0x0f;
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;
const SYSEX = 0xf0;

export type MidiMessageKind = "cc" | "noteOn" | "noteOff";

export interface ParsedMidiMessage {
  readonly status: number;
  readonly channel: number;
  readonly kind: MidiMessageKind;
  readonly data1: number;
  readonly data2: number;
}

/**
 * Interpreta os bytes crus de um `MIDIMessageEvent`.
 *
 * Sysex, running status e mensagens de sistema que não sejam note ou CC
 * devolvem `null`, porque a PoC da cabine só consome esses dois tipos.
 *
 * @param data Bytes da mensagem, em geral com três posições.
 */
export function parseMidiMessage(data: Uint8Array): ParsedMidiMessage | null {
  const status = data[0];
  if (status === undefined || status === SYSEX || status < NOTE_OFF) return null;

  const data1 = data[1];
  const data2 = data[2];
  if (data1 === undefined || data2 === undefined) return null;

  const statusClass = status & STATUS_CLASS_MASK;
  if (statusClass === CONTROL_CHANGE) {
    return { status, channel: status & CHANNEL_MASK, kind: "cc", data1, data2 };
  }
  if (statusClass === NOTE_ON) {
    return { status, channel: status & CHANNEL_MASK, kind: "noteOn", data1, data2 };
  }
  if (statusClass === NOTE_OFF) {
    return { status, channel: status & CHANNEL_MASK, kind: "noteOff", data1, data2 };
  }
  return null;
}
