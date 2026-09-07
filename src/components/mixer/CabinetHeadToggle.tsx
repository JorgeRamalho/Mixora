type CabinetHeadToggleProps = {
  hidden: boolean;
  onToggle: () => void;
  compact?: boolean;
};

/**
 * Alterna a barra interna da cabine entre visível e oculta.
 *
 * @param hidden True quando a barra está oculta e os decks usam o espaço extra.
 * @param onToggle Persiste e inverte a preferência.
 * @param compact Usa rótulo curto para a status bar.
 */
export function CabinetHeadToggle({ hidden, onToggle, compact = false }: CabinetHeadToggleProps) {
  const label = hidden
    ? compact
      ? "Barra"
      : "Mostrar barra da cabine"
    : compact
      ? "Ampliar"
      : "Ocultar barra e ampliar decks";

  return (
    <button
      type="button"
      className="mixer-cabinet-head-toggle"
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar barra da cabine" : "Ocultar barra da cabine e ampliar decks"}
      title={
        hidden
          ? "Mostrar browse e MIDI dentro do board"
          : "Ocultar barra interna e usar o espaço nos decks"
      }
      onClick={onToggle}
    >
      {label}
    </button>
  );
}
