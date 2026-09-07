import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CamelotWheel } from "../home/CamelotWheel";
import { getCamelotKey } from "../../lib/musical-key";

interface CdjCamelotPickerProps {
  /** Quando falso, não renderiza o portal. */
  open: boolean;
  /** Código Camelot já selecionado na roda. */
  selected: string;
  /** Deck que abriu o picker, usado no rótulo de acessibilidade. */
  deckId: string;
  /** Escolha de um novo tom na roda. */
  onSelect: (code: string) => void;
  /** Fecha sem alterar o filtro ativo. */
  onDismiss: () => void;
}

/**
 * Overlay da roda Camelot na cabine.
 *
 * O portal evita o corte do `transform` 3D do deck, que cliparia um filho
 * `position: fixed`. O backdrop é um botão separado para o clique na roda não
 * fechar o diálogo quando o tilt 3D desloca o desenho para fora da caixa.
 */
export function CdjCamelotPicker({
  open,
  selected,
  deckId,
  onSelect,
  onDismiss,
}: CdjCamelotPickerProps) {
  const keyColor = getCamelotKey(selected)?.color ?? "#f5b04a";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss, open]);

  if (!open) return null;

  return createPortal(
    <div className="cdj-camelot-overlay" role="presentation">
      <button
        type="button"
        className="cdj-camelot-backdrop"
        aria-label="Fechar seletor de escala Camelot"
        onClick={onDismiss}
      />
      <div
        className="cdj-camelot-popover"
        role="dialog"
        aria-modal="true"
        aria-label={`Escala Camelot · deck ${deckId.toUpperCase()}`}
        style={{ "--key-color": keyColor } as CSSProperties}
      >
        <CamelotWheel selected={selected} onSelect={onSelect} variant="flat" />
      </div>
    </div>,
    document.body,
  );
}
