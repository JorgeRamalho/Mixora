import type { RemoteCollectionMode } from "../../types/mixer";

type CollectionModeToggleProps = {
  mode: RemoteCollectionMode | null;
  onChange: (mode: RemoteCollectionMode | null) => void;
};

/**
 * Alterna entre biblioteca local e catálogo Beatport acima do painel de gênero.
 *
 * @param mode Modo ativo, ou null quando nenhum dos dois está selecionado.
 * @param onChange Callback ao clicar em Biblioteca ou Catálogo.
 */
export function CollectionModeToggle({ mode, onChange }: CollectionModeToggleProps) {
  const handleClick = (next: RemoteCollectionMode) => {
    onChange(mode === next ? null : next);
  };

  return (
    <div className="collection-mode-toggle" role="group" aria-label="Fonte da collection">
      <button
        type="button"
        className="collection-mode-toggle-btn"
        data-mode="library"
        data-active={mode === "library" ? "true" : "false"}
        aria-pressed={mode === "library"}
        onClick={() => handleClick("library")}
      >
        Biblioteca
      </button>
      <button
        type="button"
        className="collection-mode-toggle-btn"
        data-mode="catalog"
        data-active={mode === "catalog" ? "true" : "false"}
        aria-pressed={mode === "catalog"}
        onClick={() => handleClick("catalog")}
      >
        Catálogo
      </button>
    </div>
  );
}
