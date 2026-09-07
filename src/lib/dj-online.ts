import type { HarmonyRelation } from "../types/harmony";
import type { DeckId, MixerSnapshot } from "../types/mixer";
import {
  camelotRelation,
  harmonicDistance,
  harmonicSquare,
  isCamelotKey,
  relationLabel,
} from "./musical-key";

export interface DjOnlinePlan {
  masterDeck: DeckId;
  syncDeck: DeckId;
  keyA: string;
  keyB: string;
  bpmA: number;
  bpmB: number;
  relation: HarmonyRelation;
  harmony: "perfect" | "compatible" | "shift";
  melodyPath: string[];
  label: string;
}

const otherDeck = (id: DeckId): DeckId => (id === "a" ? "b" : "a");

/**
 * Escolhe o MASTER na passagem: lado do crossfader, ou o deck que está tocando.
 *
 * @param snap Snapshot corrente da cabine.
 */
export function pickMasterDeck(snap: MixerSnapshot): DeckId {
  const xf = snap.crossfader;
  if (xf <= 0.35) return "a";
  if (xf >= 0.65) return "b";
  if (snap.a.playing && !snap.b.playing) return "a";
  if (snap.b.playing && !snap.a.playing) return "b";
  return snap.masterDeck;
}

/**
 * Plano de harmonia Camelot + MASTER/SYNC para o modo DJ ONLINE.
 *
 * @param snap Snapshot com BPM e keys dos dois decks.
 */
export function planDjOnline(snap: MixerSnapshot): DjOnlinePlan {
  const masterDeck = pickMasterDeck(snap);
  const syncDeck = otherDeck(masterDeck);
  const keyA = snap.a.track.key;
  const keyB = snap.b.track.key;
  const relation =
    isCamelotKey(keyA) && isCamelotKey(keyB) ? camelotRelation(keyA, keyB) : "shift";
  const harmony =
    isCamelotKey(keyA) && isCamelotKey(keyB) ? harmonicDistance(keyA, keyB) : "shift";
  const masterKey = snap[masterDeck].track.key;
  const melodyPath = isCamelotKey(masterKey) ? harmonicSquare(masterKey) : [];

  return {
    masterDeck,
    syncDeck,
    keyA,
    keyB,
    bpmA: snap.a.bpm,
    bpmB: snap.b.bpm,
    relation,
    harmony,
    melodyPath,
    label: relationLabel(relation),
  };
}
