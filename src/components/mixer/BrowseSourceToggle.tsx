import type { BrowseSource } from "../../types/mixer";

/**
 * Alterna USB de treino e biblioteca remota sem misturar os dois cursores.
 *
 * @param value Fonte ativa.
 * @param onChange Persiste e troca a lista do encoder.
 */
export function BrowseSourceToggle({
  value,
  onChange,
}: {
  value: BrowseSource;
  onChange: (source: BrowseSource) => void;
}) {
  return (
    <div
      className="mixer-browse-source"
      role="radiogroup"
      aria-label="Fonte da biblioteca"
      data-source={value}
    >
      <button
        type="button"
        className="mixer-browse-source-btn"
        role="radio"
        aria-checked={value === "local"}
        data-active={value === "local" ? "true" : "false"}
        onClick={() => onChange("local")}
      >
        USB · treino
      </button>
      <button
        type="button"
        className="mixer-browse-source-btn"
        role="radio"
        aria-checked={value === "remote"}
        data-active={value === "remote" ? "true" : "false"}
        onClick={() => onChange("remote")}
      >
        Biblioteca · API
      </button>
    </div>
  );
}
