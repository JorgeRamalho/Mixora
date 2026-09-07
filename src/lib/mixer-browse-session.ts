import type { CamelotFilterMode } from "./tracks-api/types";
import type { DeckId } from "../types/mixer";
import { EMPTY_DECK_KEY_FILTERS, type DeckKeyFilters } from "./mixer-browse";

/** Estado de UI do browse que deve sobreviver à navegação entre rotas. */
export interface BrowseSessionSnapshot {
  cursorByDeck: Record<DeckId, number>;
  browseKeyFilterByDeck: DeckKeyFilters;
  browseCamelotMode: CamelotFilterMode;
  /** Deck cuja playlist o encoder BROWSE da DDJ-400 navega no momento. */
  browseActiveDeck: DeckId;
}

type BrowseSessionListener = () => void;

const listeners = new Set<BrowseSessionListener>();

let snapshot: BrowseSessionSnapshot = {
  cursorByDeck: { a: 0, b: 0 },
  browseKeyFilterByDeck: { ...EMPTY_DECK_KEY_FILTERS },
  browseCamelotMode: "compatible",
  browseActiveDeck: "a",
};

/**
 * Snapshot atual da sessão de browse, para hidratar o MixerBoard sem perder
 * cursor e filtros ao sair de `/mixer`.
 */
export function getBrowseSessionSnapshot(): BrowseSessionSnapshot {
  return snapshot;
}

/**
 * Inscreve o React nas mudanças da sessão de browse.
 *
 * @param listener Callback disparado após cada atualização.
 */
export function subscribeBrowseSession(listener: BrowseSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mescla um patch no snapshot da sessão e notifica os inscritos.
 *
 * @param patch Campos parciais a atualizar.
 */
export function updateBrowseSession(patch: Partial<BrowseSessionSnapshot>): void {
  snapshot = {
    cursorByDeck: patch.cursorByDeck ?? snapshot.cursorByDeck,
    browseKeyFilterByDeck: patch.browseKeyFilterByDeck ?? snapshot.browseKeyFilterByDeck,
    browseCamelotMode: patch.browseCamelotMode ?? snapshot.browseCamelotMode,
    browseActiveDeck: patch.browseActiveDeck ?? snapshot.browseActiveDeck,
  };
  for (const listener of listeners) listener();
}

/**
 * Grava o cursor de um deck na sessão de browse.
 *
 * @param deckId Lado da cabine.
 * @param index Posição na lista filtrada.
 */
export function setBrowseCursor(deckId: DeckId, index: number): void {
  updateBrowseSession({
    cursorByDeck: { ...snapshot.cursorByDeck, [deckId]: index },
  });
}

/**
 * Define qual deck recebe o encoder BROWSE da DDJ-400.
 *
 * @param deckId Lado da cabine que passa a ser o alvo do browse.
 */
export function setBrowseActiveDeck(deckId: DeckId): void {
  updateBrowseSession({ browseActiveDeck: deckId });
}

/**
 * Zera cursor e filtros ao trocar a fonte USB/API, como no fluxo original.
 */
export function resetBrowseSessionForSourceChange(): void {
  updateBrowseSession({
    cursorByDeck: { a: 0, b: 0 },
    browseKeyFilterByDeck: { ...EMPTY_DECK_KEY_FILTERS },
    browseCamelotMode: "compatible",
    browseActiveDeck: "a",
  });
}

/**
 * Hidrata a sessão na primeira montagem quando ainda está nos defaults.
 *
 * @param cursorByDeck Cursor calculado a partir da faixa carregada no engine.
 */
export function seedBrowseSessionIfPristine(cursorByDeck: Record<DeckId, number>): void {
  const pristine =
    snapshot.cursorByDeck.a === 0 &&
    snapshot.cursorByDeck.b === 0 &&
    snapshot.browseKeyFilterByDeck.a === null &&
    snapshot.browseKeyFilterByDeck.b === null &&
    snapshot.browseCamelotMode === "compatible";
  if (!pristine) return;
  updateBrowseSession({ cursorByDeck });
}
