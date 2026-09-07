import type { DeckId } from "../types/mixer";

type DeckInputLookup = (deckId: DeckId) => HTMLInputElement | null;

export interface ArmDeckFileInputOptions {
  /** Marca o deck na UI enquanto espera o gesto. */
  onArm?: (deckId: DeckId) => void;
  /** Limpa o destaque quando o gesto chega ou o usuário cancela. */
  onDisarm?: () => void;
}

let armedCleanup: (() => void) | null = null;

/**
 * Clica no input de arquivo do deck.
 *
 * @param deckId Deck cujo picker deve abrir.
 * @param lookup Função que devolve o input montado pelo React.
 */
export function clickDeckFileInput(deckId: DeckId, lookup: DeckInputLookup): void {
  lookup(deckId)?.click();
}

/**
 * Espera o próximo toque na página e só então abre o picker.
 *
 * O browser bloqueia `input.click()` sem gesto do usuário, e por isso o LOAD
 * físico da DDJ-400 precisa deste passo intermediário.
 *
 * @param deckId Deck que receberá o arquivo.
 * @param lookup Função que devolve o input montado pelo React.
 * @param options Callbacks para a UI acompanhar o estado pendente.
 */
export function armDeckFileInput(
  deckId: DeckId,
  lookup: DeckInputLookup,
  options: ArmDeckFileInputOptions = {},
): void {
  armedCleanup?.();

  const cleanup = () => {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    armedCleanup = null;
  };

  const finishArm = () => {
    cleanup();
    options.onDisarm?.();
  };

  const onPointerDown = () => {
    finishArm();
    clickDeckFileInput(deckId, lookup);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    finishArm();
  };

  armedCleanup = cleanup;
  options.onArm?.(deckId);
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKeyDown, true);
}

/**
 * Cancela um picker armado, se ainda estiver esperando gesto.
 */
export function disarmDeckFileInput(): void {
  armedCleanup?.();
}
