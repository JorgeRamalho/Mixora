import type { DeckId } from "../types/mixer";

type FilePickerAcceptType = {
  description: string;
  accept: Record<string, string[]>;
};

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: FilePickerAcceptType[];
    }) => Promise<FileSystemFileHandle[]>;
  }
}

export interface ArmDeckFileInputOptions {
  /** Marca o deck na UI enquanto espera o gesto. */
  onArm?: (deckId: DeckId) => void;
  /** Limpa o destaque quando o gesto chega ou o usuário cancela. */
  onDisarm?: () => void;
}

const AUDIO_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "Áudio",
    accept: {
      "audio/*": [".mp3", ".wav", ".flac", ".aac", ".m4a", ".ogg"],
    },
  },
];

let armedCleanup: (() => void) | null = null;
let suppressNextLoadClick = false;

/**
 * Id estável do input de arquivo de cada deck, usado pelo picker e pelos testes.
 *
 * @param deckId Deck A ou B.
 */
export function deckFileInputId(deckId: DeckId): string {
  return `mamute-deck-file-${deckId}`;
}

/**
 * Infere o deck a partir do botão LOAD ou do input de arquivo clicado.
 *
 * @param target Alvo do gesto do usuário.
 */
export function deckIdFromLoadControl(target: EventTarget | null): DeckId | null {
  if (!(target instanceof Element)) return null;
  const deckRoot = target.closest(".cdj-deck[data-deck]");
  if (!deckRoot) return null;
  const isLoad = target.closest(".cdj-btn--load, input[data-deck-file]");
  if (!isLoad) return null;
  const id = deckRoot.getAttribute("data-deck");
  return id === "a" || id === "b" ? id : null;
}

/**
 * Localiza o input de arquivo do deck no DOM.
 *
 * @param deckId Deck consultado.
 */
export function findDeckFileInput(deckId: DeckId): HTMLInputElement | null {
  const byId = document.getElementById(deckFileInputId(deckId));
  if (byId instanceof HTMLInputElement) return byId;
  return document.querySelector<HTMLInputElement>(`input[data-deck-file="${deckId}"]`);
}

/**
 * Clica no input de arquivo do deck.
 *
 * @param deckId Deck cujo picker deve abrir.
 */
export function clickDeckFileInput(deckId: DeckId): void {
  findDeckFileInput(deckId)?.click();
}

/**
 * Evita abrir o picker duas vezes quando o arm MIDI já tratou o pointerdown no LOAD.
 */
export function consumeLoadClickSuppression(): boolean {
  const suppressed = suppressNextLoadClick;
  suppressNextLoadClick = false;
  return suppressed;
}

/**
 * O Edge bloqueia `input.click()` em campos invisíveis; o Chrome e o Playwright
 * continuam usando o input oculto, que os testes E2E alimentam com setInputFiles.
 */
function shouldUseFileSystemAccessPicker(): boolean {
  if (typeof window.showOpenFilePicker !== "function") return false;
  return /\bEdg\//i.test(navigator.userAgent);
}

/**
 * Abre o seletor de arquivo com `showOpenFilePicker` no Edge, ou com
 * `input.click()` nos demais Chromium, porque o Edge bloqueia o input invisível.
 *
 * @param deckId Deck destino.
 * @param onFile Callback com o arquivo escolhido.
 */
export async function openDeckFileDialog(
  deckId: DeckId,
  onFile: (file: File) => void,
): Promise<void> {
  if (shouldUseFileSystemAccessPicker()) {
    const openPicker = window.showOpenFilePicker;
    if (!openPicker) {
      clickDeckFileInput(deckId);
      return;
    }

    try {
      const handles = await openPicker({
        multiple: false,
        types: AUDIO_PICKER_TYPES,
      });
      const handle = handles[0];
      if (!handle) return;
      onFile(await handle.getFile());
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  clickDeckFileInput(deckId);
}

/**
 * Espera o próximo toque na página e só então abre o picker.
 *
 * O browser bloqueia `input.click()` sem gesto do usuário, e por isso o LOAD
 * físico da DDJ-400 precisa deste passo intermediário.
 *
 * @param deckId Deck que receberá o arquivo.
 * @param onFile Callback com o arquivo escolhido.
 * @param options Callbacks para a UI acompanhar o estado pendente.
 */
export function armDeckFileInput(
  deckId: DeckId,
  onFile: (deckId: DeckId, file: File) => void,
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

  const onPointerDown = (event: PointerEvent) => {
    const uiDeck = deckIdFromLoadControl(event.target);
    const targetDeck = uiDeck ?? deckId;
    if (uiDeck) suppressNextLoadClick = true;
    finishArm();
    void openDeckFileDialog(targetDeck, (file) => onFile(targetDeck, file));
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
