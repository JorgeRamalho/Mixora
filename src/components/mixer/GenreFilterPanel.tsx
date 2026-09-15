import type { GenreResponse } from "../../lib/tracks-api/types";

type GenreFilterPanelProps = {
  genres: readonly GenreResponse[];
  selectedName: string | null;
  selectedId: number | null;
  emptyCopy: string | null;
  hasSubgenres: boolean;
  subgenrePanelOpen: boolean;
  onSelectGenre: (genre: GenreResponse | null) => void;
  onSelectedGenreClick: () => void;
  onSelectedGenrePointerActivity: () => void;
  onSelectedGenrePointerLeave: () => void;
};

/**
 * Painel lateral da collection com a lista rolável de gêneros.
 *
 * @param props Taxonomia, seleção e callbacks de hover do gênero ativo.
 */
export function GenreFilterPanel({
  genres,
  selectedName,
  selectedId,
  emptyCopy,
  hasSubgenres,
  subgenrePanelOpen,
  onSelectGenre,
  onSelectedGenreClick,
  onSelectedGenrePointerActivity,
  onSelectedGenrePointerLeave,
}: GenreFilterPanelProps) {
  return (
    <nav className="collection-genres" aria-label="Filtrar por gênero">
      <p className="collection-genres-label">Gênero</p>
      <ul className="collection-genres-list">
        <li>
          <button
            type="button"
            className="collection-genre-item"
            data-genre-item="all"
            data-active={selectedName === null ? "true" : "false"}
            aria-pressed={selectedName === null}
            onClick={() => onSelectGenre(null)}
          >
            Todos
          </button>
        </li>
        {genres.map((genre) => {
          const isSelected = selectedId === genre.id;
          return (
            <li key={genre.id}>
              <button
                type="button"
                className="collection-genre-item"
                data-genre-item={genre.name}
                data-active={isSelected ? "true" : "false"}
                data-has-subgenres={isSelected && hasSubgenres ? "true" : "false"}
                aria-pressed={isSelected}
                aria-haspopup={isSelected && hasSubgenres ? "true" : undefined}
                aria-expanded={isSelected && hasSubgenres ? subgenrePanelOpen : undefined}
                onClick={() => {
                  if (isSelected) {
                    onSelectedGenreClick();
                    return;
                  }
                  onSelectGenre(genre);
                }}
                onMouseEnter={() => {
                  if (isSelected) onSelectedGenrePointerActivity();
                }}
                onMouseMove={() => {
                  if (isSelected) onSelectedGenrePointerActivity();
                }}
                onMouseLeave={() => {
                  if (isSelected) onSelectedGenrePointerLeave();
                }}
              >
                {genre.name}
              </button>
            </li>
          );
        })}
      </ul>
      {emptyCopy ? <p className="collection-genres-empty">{emptyCopy}</p> : null}
    </nav>
  );
}
