import type { GenreResponse } from "../../lib/tracks-api/types";

type SubgenreFilterPanelProps = {
  /** Subgêneros do gênero ativo. */
  subgenres: readonly GenreResponse[];
  /** Nome ativo na sessão, ou null para listar todos. */
  selected: string | null;
  /** Escolhe um subgênero ou volta para todos. */
  onSelect: (name: string | null) => void;
  /** Classes extras para a variante flutuante da collection. */
  className?: string;
};

/**
 * Painel flutuante de subgênero, no mesmo chrome do filtro Key.
 *
 * @param props Lista, seleção atual e callback da sessão.
 */
export function SubgenreFilterPanel({
  subgenres,
  selected,
  onSelect,
  className,
}: SubgenreFilterPanelProps) {
  const rootClass = className ? `collection-subgenre ${className}` : "collection-subgenre";

  return (
    <nav className={rootClass} aria-label="Filtrar por subgênero">
      <p className="collection-camelot-label">Subgênero</p>
      <ul className="collection-subgenre-list">
        <li>
          <button
            type="button"
            className="collection-camelot-clear"
            data-subgenre-item="all"
            data-active={selected === null ? "true" : "false"}
            aria-pressed={selected === null}
            onClick={() => onSelect(null)}
          >
            Todos
          </button>
        </li>
        {subgenres.map((item) => {
          const isActive = selected === item.name;
          return (
            <li key={item.id}>
              <button
                type="button"
                className="collection-subgenre-item"
                data-subgenre-item={item.name}
                data-active={isActive ? "true" : "false"}
                aria-pressed={isActive}
                onClick={() => onSelect(isActive ? null : item.name)}
              >
                {item.name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
