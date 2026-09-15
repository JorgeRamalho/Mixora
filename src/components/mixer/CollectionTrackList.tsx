import { useVirtualizer } from "@tanstack/react-virtual";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  areCollectionColumnFiltersEqual,
  type CollectionColumnFilterField,
  type CollectionColumnFilters,
} from "../../lib/collection-column-filters";
import { formatTrackDuration } from "../../lib/format-track-duration";
import { getCamelotKey } from "../../lib/musical-key";
import {
  endCollectionDrag,
  getCollectionDragTrackId,
  startCollectionDrag,
} from "../../lib/collection-drag";
import type { BrowseTrackItem, DeckId } from "../../types/mixer";
import { TrackWaveformPreview } from "./TrackWaveformPreview";

/** Altura estimada de uma linha da collection para o virtualizer (px). */
const COLLECTION_ROW_ESTIMATE_PX = 27;

/** Linhas extras montadas acima e abaixo do viewport para scroll suave. */
const COLLECTION_ROW_OVERSCAN = 6;

/** Espera após a última tecla antes de recortar a API e o cursor. */
const COLUMN_FILTER_DEBOUNCE_MS = 300;

type CollectionTrackListProps = {
  tracks: readonly BrowseTrackItem[];
  browseCursor: number;
  loadedTrackIds: readonly string[];
  libraryLoading: boolean;
  browseIdle: boolean;
  browseIdleCopy: string | null;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  columnFilters: CollectionColumnFilters;
  onColumnFiltersChange: (filters: CollectionColumnFilters) => void;
  onSelectTrack: (trackId: string) => void;
  onDropTrack: (deckId: DeckId, trackId: string) => void;
};

type CollectionTrackRowProps = {
  track: BrowseTrackItem;
  isFocused: boolean;
  isLoaded: boolean;
  onSelectTrack: (trackId: string) => void;
};

const GRID_COLUMNS =
  "13rem minmax(4.5rem, 0.9fr) minmax(4.5rem, 1fr) minmax(3.2rem, 0.7fr) 3rem 2.8rem 2.6rem minmax(3rem, 0.65fr) 2.4rem minmax(3rem, 0.65fr)";

const COLUMN_HEADER_SLOTS = [
  { kind: "label", key: "wave", label: "Wave" },
  { kind: "input", field: "artist", label: "Artista" },
  { kind: "input", field: "title", label: "Faixa" },
  { kind: "input", field: "album", label: "Álbum/EP" },
  { kind: "input", field: "bpm", label: "BPM" },
  { kind: "input", field: "camelot", label: "Camelot" },
  { kind: "label", key: "key", label: "Key" },
  { kind: "label", key: "genre", label: "Gênero" },
  { kind: "label", key: "time", label: "Tempo" },
  { kind: "input", field: "label", label: "Label" },
] as const;

/**
 * Compara props estáveis da lista e evita reconciliar linhas quando só o mixer mudou.
 *
 * @param previous Props anteriores.
 * @param next Props novas.
 */
function collectionTrackListPropsEqual(
  previous: CollectionTrackListProps,
  next: CollectionTrackListProps,
): boolean {
  return (
    previous.tracks === next.tracks &&
    previous.browseCursor === next.browseCursor &&
    previous.loadedTrackIds === next.loadedTrackIds &&
    previous.libraryLoading === next.libraryLoading &&
    previous.browseIdle === next.browseIdle &&
    previous.browseIdleCopy === next.browseIdleCopy &&
    previous.loadingMore === next.loadingMore &&
    previous.hasMore === next.hasMore &&
    previous.onLoadMore === next.onLoadMore &&
    previous.columnFilters === next.columnFilters &&
    previous.onColumnFiltersChange === next.onColumnFiltersChange &&
    previous.onSelectTrack === next.onSelectTrack &&
    previous.onDropTrack === next.onDropTrack
  );
}

/**
 * Compara uma linha da collection por foco e estado de carregamento no deck.
 *
 * @param previous Props anteriores.
 * @param next Props novas.
 */
function collectionTrackRowPropsEqual(
  previous: CollectionTrackRowProps,
  next: CollectionTrackRowProps,
): boolean {
  return (
    previous.track === next.track &&
    previous.isFocused === next.isFocused &&
    previous.isLoaded === next.isLoaded &&
    previous.onSelectTrack === next.onSelectTrack
  );
}

/**
 * Linha memoizada da collection; só reconcilia quando foco ou carga no deck mudam.
 *
 * @param props Faixa, foco e callback de seleção.
 */
const CollectionTrackRow = memo(function CollectionTrackRow({
  track,
  isFocused,
  isLoaded,
  onSelectTrack,
}: CollectionTrackRowProps) {
  const camelotColor = getCamelotKey(track.key ?? "")?.color ?? "#8b8fa8";
  const musicalLabel = track.musicalKey ?? getCamelotKey(track.key ?? "")?.nameIntl ?? "—";

  return (
    <button
      type="button"
      role="option"
      className="collection-track-row"
      data-track-id={track.id}
      data-browse-focus={isFocused ? "true" : "false"}
      aria-selected={isLoaded}
      onClick={() => onSelectTrack(track.id)}
      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
        startCollectionDrag(track.id);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onMouseDown={() => startCollectionDrag(track.id)}
    >
      <TrackWaveformPreview
        samples={track.waveformPreview}
        accentColor={camelotColor}
        camelotKey={track.key}
        lazy
      />
      <span className="collection-track-artist">{track.artist}</span>
      <span className="collection-track-title">{track.title}</span>
      <span className="collection-track-album">{track.albumOrMix ?? "—"}</span>
      <span className="collection-track-bpm">{track.bpm ?? "—"}</span>
      <span
        className="collection-track-camelot"
        style={{ "--camelot-color": camelotColor } as CSSProperties}
      >
        {track.key ?? "—"}
      </span>
      <span className="collection-track-musical">{musicalLabel}</span>
      <span className="collection-track-genre">{track.genre ?? "—"}</span>
      <span className="collection-track-time">{formatTrackDuration(track.durationMs)}</span>
      <span className="collection-track-label">{track.label ?? "—"}</span>
    </button>
  );
}, collectionTrackRowPropsEqual);

type CollectionColumnFilterInputProps = {
  field: CollectionColumnFilterField;
  label: string;
  value: string;
  onValueChange: (field: CollectionColumnFilterField, value: string) => void;
};

/**
 * Impede o Enter do input de recarregar a rota.
 *
 * @param event Submit do form de filtros.
 */
function preventFilterSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

/**
 * Campo de busca no span do header. O placeholder é o nome da coluna.
 *
 * @param props Campo, rótulo visível e valor controlado do rascunho.
 */
function CollectionColumnFilterInput({
  field,
  label,
  value,
  onValueChange,
}: CollectionColumnFilterInputProps) {
  const filled = value.trim().length > 0;
  const ariaLabel = field === "camelot" ? "Camelot Key" : label;

  return (
    <span className="collection-tracks-header-cell" data-filterable="true" data-filled={filled ? "true" : "false"}>
      <input
        type="search"
        className="collection-tracks-filter-input"
        data-column-filter={field}
        data-filled={filled ? "true" : "false"}
        aria-label={ariaLabel}
        placeholder={label}
        title={ariaLabel}
        value={value}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode={field === "bpm" ? "decimal" : "search"}
        onChange={(event) => onValueChange(field, event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          event.stopPropagation();
          if (event.key !== "Escape") return;
          if (value) {
            event.preventDefault();
            onValueChange(field, "");
            return;
          }
          event.currentTarget.blur();
        }}
        onPointerDown={(event) => event.stopPropagation()}
      />
    </span>
  );
}

/**
 * Tabela compacta da collection com colunas sticky, virtualização e scroll infinito.
 *
 * @param props Linhas, cursor, paginação e callbacks de seleção e drop.
 */
export const CollectionTrackList = memo(function CollectionTrackList({
  tracks,
  browseCursor,
  loadedTrackIds,
  libraryLoading,
  browseIdle,
  browseIdleCopy,
  loadingMore,
  hasMore,
  onLoadMore,
  columnFilters,
  onColumnFiltersChange,
  onSelectTrack,
  onDropTrack,
}: CollectionTrackListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadedTrackIdSet = useMemo(() => new Set(loadedTrackIds), [loadedTrackIds]);
  const [draftFilters, setDraftFilters] = useState(columnFilters);

  useEffect(() => {
    setDraftFilters(columnFilters);
  }, [columnFilters]);

  useEffect(() => {
    if (areCollectionColumnFiltersEqual(draftFilters, columnFilters)) return;
    const timer = window.setTimeout(() => {
      onColumnFiltersChange(draftFilters);
    }, COLUMN_FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [columnFilters, draftFilters, onColumnFiltersChange]);

  /**
   * Atualiza o rascunho de uma coluna sem esperar o debounce da API.
   *
   * @param field Coluna editada.
   * @param value Texto digitado.
   */
  const handleDraftChange = (field: CollectionColumnFilterField, value: string) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => COLLECTION_ROW_ESTIMATE_PX,
    overscan: COLLECTION_ROW_OVERSCAN,
    getItemKey: (index) => tracks[index]?.id ?? index,
  });

  useEffect(() => {
    if (browseCursor < 0 || browseCursor >= tracks.length) return;
    rowVirtualizer.scrollToIndex(browseCursor, { align: "auto" });
  }, [browseCursor, tracks.length, rowVirtualizer]);

  useEffect(() => {
    const onUp = (event: PointerEvent | MouseEvent) => {
      const trackId = getCollectionDragTrackId();
      if (!trackId) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const deck = target?.closest<HTMLElement>(".cdj-deck");
      const deckId = deck?.getAttribute("data-deck");
      endCollectionDrag();
      if (deckId === "a" || deckId === "b") {
        onDropTrack(deckId, trackId);
      }
    };
    const onCancel = () => endCollectionDrag();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [onDropTrack]);

  useEffect(() => {
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loadingMore) {
          onLoadMore();
        }
      },
      { root, rootMargin: "120px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, tracks.length]);

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div className="collection-tracks">
      <div ref={listRef} className="collection-tracks-scroll" role="presentation">
        <div
          className="collection-tracks-table"
          role="listbox"
          aria-label="Faixas da collection"
          style={{ "--collection-grid": GRID_COLUMNS } as CSSProperties}
        >
          <div className="collection-tracks-chrome">
            <form
              className="collection-tracks-header-row"
              aria-label="Filtrar faixas da collection"
              onSubmit={preventFilterSubmit}
            >
              {COLUMN_HEADER_SLOTS.map((slot) =>
                slot.kind === "input" ? (
                  <CollectionColumnFilterInput
                    key={slot.field}
                    field={slot.field}
                    label={slot.label}
                    value={draftFilters[slot.field]}
                    onValueChange={handleDraftChange}
                  />
                ) : (
                  <span key={slot.key} className="collection-tracks-header-cell">
                    {slot.label}
                  </span>
                ),
              )}
            </form>
          </div>
          {libraryLoading ? (
            <p className="collection-tracks-empty">Carregando biblioteca…</p>
          ) : null}
          {!libraryLoading && browseIdle && browseIdleCopy ? (
            <p className="collection-tracks-empty">{browseIdleCopy}</p>
          ) : null}
          {!libraryLoading && !browseIdle && tracks.length === 0 ? (
            <p className="collection-tracks-empty">Nenhuma faixa neste filtro</p>
          ) : null}
          {!libraryLoading && tracks.length > 0 ? (
            <div
              className="collection-tracks-virtual-body"
              style={{ height: rowVirtualizer.getTotalSize() }}
            >
              {virtualRows.map((virtualRow) => {
                const track = tracks[virtualRow.index];
                if (!track) return null;

                return (
                  <div
                    key={track.id}
                    className="collection-tracks-virtual-row"
                    data-index={virtualRow.index}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <CollectionTrackRow
                      track={track}
                      isFocused={virtualRow.index === browseCursor}
                      isLoaded={loadedTrackIdSet.has(track.id)}
                      onSelectTrack={onSelectTrack}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
          {loadingMore ? <p className="collection-tracks-loading-more">Carregando mais…</p> : null}
          <div ref={sentinelRef} className="collection-tracks-sentinel" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}, collectionTrackListPropsEqual);
