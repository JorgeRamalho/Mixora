import { useEffect, useRef, type CSSProperties } from "react";
import { getCamelotKey } from "../../lib/musical-key";
import type { BrowseSource, BrowseTrackItem, DeckId } from "../../types/mixer";

type DeckPlaylistProps = {
  deckId: DeckId;
  side: "left" | "right";
  tracks: readonly BrowseTrackItem[];
  loadedTrackId: string;
  browseCursor: number;
  browseSource: BrowseSource;
  libraryLoading: boolean;
  browseKeyFilter: string | null;
  keyFilterFlash: number;
  /** Cor Camelot da faixa carregada no deck, para o halo ambiente. */
  camelotColor: string;
  onSelectTrack: (trackId: string) => void;
};

/**
 * Lista lateral de faixas com iluminação Camelot, espelhando o visor do deck.
 *
 * @param props Configuração da playlist e callbacks de carregamento.
 */
export function DeckPlaylist({
  deckId,
  side,
  tracks,
  loadedTrackId,
  browseCursor,
  browseSource,
  libraryLoading,
  browseKeyFilter,
  keyFilterFlash,
  camelotColor,
  onSelectTrack,
}: DeckPlaylistProps) {
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const filterColor = browseKeyFilter ? (getCamelotKey(browseKeyFilter)?.color ?? "#f5b04a") : null;
  const panelStyle = {
    "--camelot-color": camelotColor,
    ...(filterColor ? { "--browse-key-color": filterColor } : {}),
  } as CSSProperties;

  useEffect(() => {
    if (keyFilterFlash <= 0 || !filterColor) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.classList.remove("deck-playlist--key-flash");
    void panel.offsetWidth;
    panel.classList.add("deck-playlist--key-flash");
    const timer = window.setTimeout(() => panel.classList.remove("deck-playlist--key-flash"), 720);
    return () => window.clearTimeout(timer);
  }, [filterColor, keyFilterFlash]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || tracks.length === 0) return;
    const focused = list.querySelector<HTMLElement>('[data-browse-focus="true"]');
    focused?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [browseCursor, tracks.length]);

  const sourceLabel =
    browseSource === "remote" ? "Biblioteca · API online" : "USB · treino Mamute";

  return (
    <aside
      ref={panelRef}
      className="deck-playlist"
      data-deck={deckId}
      data-side={side}
      data-browse-key={browseKeyFilter ?? undefined}
      style={panelStyle}
      aria-label={`Biblioteca deck ${deckId.toUpperCase()}`}
    >
      <span className="deck-playlist-glint" aria-hidden="true" />
      <header className="deck-playlist-head">
        <span className="deck-playlist-tag">DECK {deckId.toUpperCase()}</span>
        <span className="deck-playlist-source">
          {sourceLabel}
          {browseKeyFilter ? ` · ${browseKeyFilter}` : ""}
        </span>
      </header>

      <ul
        ref={listRef}
        className="deck-playlist-list"
        role="listbox"
        aria-label={`Faixas deck ${deckId.toUpperCase()}`}
      >
        {libraryLoading && tracks.length === 0 ? (
          <li className="deck-playlist-empty" role="presentation">Carregando biblioteca…</li>
        ) : null}
        {!libraryLoading && tracks.length === 0 && browseKeyFilter ? (
          <li className="deck-playlist-empty" role="presentation">
            Nenhuma faixa em {browseKeyFilter}
            {browseSource === "remote"
              ? " na biblioteca remota"
              : " no USB de treino"}
          </li>
        ) : null}
        {tracks.map((track, index) => {
          const keyColor = getCamelotKey(track.key ?? "")?.color ?? "#8b8fa8";
          const isLoaded =
            !loadedTrackId.startsWith("file:") && track.id === loadedTrackId;
          const isBrowseFocus = index === browseCursor;

          return (
            <li key={track.id} role="presentation">
              <button
                type="button"
                className="deck-playlist-item"
                role="option"
                aria-selected={isLoaded}
                data-browse-focus={isBrowseFocus ? "true" : "false"}
                data-loaded={isLoaded ? "true" : "false"}
                style={{ "--track-key-color": keyColor } as CSSProperties}
                onClick={() => onSelectTrack(track.id)}
              >
                <span className="deck-playlist-item-key" aria-hidden="true">{track.key ?? "—"}</span>
                <span className="deck-playlist-item-copy">
                  <strong>{track.title}</strong>
                  <span>{track.artist}</span>
                </span>
                <span className="deck-playlist-item-bpm">
                  {track.bpm != null ? `${track.bpm} BPM` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
