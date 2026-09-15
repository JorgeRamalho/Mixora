import { useCallback, useEffect, useRef, useState, type MouseEvent, type MutableRefObject } from "react";
import type { CollectionColumnFilters } from "../../lib/collection-column-filters";
import type { BrowseTrackItem, DeckId, RemoteCollectionMode } from "../../types/mixer";
import type { GenreResponse } from "../../lib/tracks-api/types";
import { CamelotFilterPanel } from "./CamelotFilterPanel";
import { CollectionModeToggle } from "./CollectionModeToggle";
import { CollectionTrackList } from "./CollectionTrackList";
import { GenreFilterPanel } from "./GenreFilterPanel";
import { SubgenreFilterPanel } from "./SubgenreFilterPanel";

const PANEL_DWELL_MS = 1000;
const PANEL_CLOSE_DELAY_MS = 1250;

type CollectionBrowserProps = {
  tracks: readonly BrowseTrackItem[];
  browseCursor: number;
  loadedTrackIds: readonly string[];
  libraryLoading: boolean;
  browseIdle: boolean;
  browseIdleCopy: string | null;
  collectionMode: RemoteCollectionMode | null;
  onCollectionModeChange: (mode: RemoteCollectionMode | null) => void;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  genres: readonly GenreResponse[];
  selectedGenre: string | null;
  selectedGenreId: number | null;
  subgenres: readonly GenreResponse[];
  selectedSubgenre: string | null;
  emptyGenreCopy: string | null;
  onSelectGenre: (genre: GenreResponse | null) => void;
  onSelectSubgenre: (name: string | null) => void;
  browseKeyFilter: string | null;
  onSelectCamelot: (code: string | null) => void;
  columnFilters: CollectionColumnFilters;
  onColumnFiltersChange: (filters: CollectionColumnFilters) => void;
  onSelectTrack: (trackId: string) => void;
  onDropTrack: (deckId: DeckId, trackId: string) => void;
};

/**
 * Limpa um timeout pendente, se existir.
 *
 * @param timerRef Referência ao timeout ativo.
 */
function clearTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current !== null) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

/**
 * Diz se o ponteiro está no chrome de gênero ou no painel de subgênero.
 *
 * @param target Elemento sob o ponteiro.
 */
function isGenreChrome(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest(".collection-genres, .collection-subgenre-anchor"))
  );
}

/**
 * Rodapé Rekordbox: gênero, subgênero flutuante, filtro Camelot e lista da API.
 *
 * @param props Estado da collection e callbacks do MixerBoard.
 */
export function CollectionBrowser({
  tracks,
  browseCursor,
  loadedTrackIds,
  libraryLoading,
  browseIdle,
  browseIdleCopy,
  collectionMode,
  onCollectionModeChange,
  loadingMore,
  hasMore,
  onLoadMore,
  genres,
  selectedGenre,
  selectedGenreId,
  subgenres,
  selectedSubgenre,
  emptyGenreCopy,
  onSelectGenre,
  onSelectSubgenre,
  browseKeyFilter,
  onSelectCamelot,
  columnFilters,
  onColumnFiltersChange,
  onSelectTrack,
  onDropTrack,
}: CollectionBrowserProps) {
  const [camelotOpen, setCamelotOpen] = useState(false);
  const [subgenreOpen, setSubgenreOpen] = useState(false);
  const browserRef = useRef<HTMLElement>(null);
  const camelotAnchorRef = useRef<HTMLDivElement>(null);
  const subgenreAnchorRef = useRef<HTMLDivElement>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subgenreDwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subgenreCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInsideCamelotRef = useRef(false);
  const pointerInsideSubgenreRef = useRef(false);
  const pointerOnSelectedGenreRef = useRef(false);
  const subgenreOpenRef = useRef(false);
  const suppressSubgenreOpenRef = useRef(false);

  const hasSubgenres = selectedGenreId !== null && subgenres.length > 0;
  subgenreOpenRef.current = subgenreOpen;

  const cancelCamelotClose = useCallback(() => {
    clearTimer(closeTimerRef);
  }, []);

  const closeCamelotPanel = useCallback(() => {
    clearTimer(dwellTimerRef);
    clearTimer(closeTimerRef);
    pointerInsideCamelotRef.current = false;
    setCamelotOpen(false);
  }, []);

  const closeSubgenrePanel = useCallback(() => {
    clearTimer(subgenreDwellRef);
    clearTimer(subgenreCloseRef);
    pointerInsideSubgenreRef.current = false;
    setSubgenreOpen(false);
  }, []);

  /**
   * Agenda o fechamento do Camelot após 1,25s com o ponteiro fora do painel.
   */
  const scheduleCamelotClose = useCallback(() => {
    if (!camelotOpen || closeTimerRef.current !== null) return;
    closeTimerRef.current = setTimeout(() => {
      pointerInsideCamelotRef.current = false;
      closeTimerRef.current = null;
      setCamelotOpen(false);
    }, PANEL_CLOSE_DELAY_MS);
  }, [camelotOpen]);

  /**
   * Agenda a abertura do Camelot após 1s parado fora da coluna de gênero.
   */
  const scheduleDwellOpen = useCallback(() => {
    if (camelotOpen) return;
    clearTimer(dwellTimerRef);
    dwellTimerRef.current = setTimeout(() => {
      closeSubgenrePanel();
      setCamelotOpen(true);
      dwellTimerRef.current = null;
    }, PANEL_DWELL_MS);
  }, [camelotOpen, closeSubgenrePanel]);

  /**
   * Agenda o fechamento do subgênero se o ponteiro saiu do gênero e do painel.
   */
  const scheduleSubgenreClose = useCallback(() => {
    if (!subgenreOpen || subgenreCloseRef.current !== null) return;
    if (pointerOnSelectedGenreRef.current || pointerInsideSubgenreRef.current) return;
    subgenreCloseRef.current = setTimeout(() => {
      pointerInsideSubgenreRef.current = false;
      subgenreCloseRef.current = null;
      setSubgenreOpen(false);
    }, PANEL_CLOSE_DELAY_MS);
  }, [subgenreOpen]);

  /**
   * Agenda a abertura do subgênero após 1s parado no gênero selecionado.
   */
  const scheduleSubgenreOpen = useCallback(() => {
    if (!hasSubgenres || subgenreOpenRef.current || suppressSubgenreOpenRef.current) return;
    clearTimer(subgenreDwellRef);
    subgenreDwellRef.current = setTimeout(() => {
      if (suppressSubgenreOpenRef.current || !hasSubgenres) {
        subgenreDwellRef.current = null;
        return;
      }
      closeCamelotPanel();
      setSubgenreOpen(true);
      subgenreDwellRef.current = null;
    }, PANEL_DWELL_MS);
  }, [closeCamelotPanel, hasSubgenres]);

  const cancelSubgenreClose = useCallback(() => {
    clearTimer(subgenreCloseRef);
  }, []);

  /**
   * Sincroniza se o ponteiro está sobre o painel Camelot e agenda o fechamento.
   *
   * @param target Elemento sob o ponteiro.
   */
  const syncPointerOverCamelot = useCallback(
    (target: EventTarget | null) => {
      const overPanel =
        target instanceof Node && Boolean(camelotAnchorRef.current?.contains(target));

      if (overPanel) {
        if (!pointerInsideCamelotRef.current) {
          pointerInsideCamelotRef.current = true;
          cancelCamelotClose();
        }
        return;
      }

      if (pointerInsideCamelotRef.current) {
        pointerInsideCamelotRef.current = false;
        scheduleCamelotClose();
        return;
      }

      scheduleCamelotClose();
    },
    [cancelCamelotClose, scheduleCamelotClose],
  );

  const handleBrowserMouseEnter = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (isGenreChrome(event.target)) return;
      scheduleDwellOpen();
    },
    [scheduleDwellOpen],
  );

  const handleBrowserMouseMove = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (isGenreChrome(event.target)) {
        clearTimer(dwellTimerRef);
        return;
      }
      if (!camelotOpen) {
        scheduleDwellOpen();
        return;
      }
      syncPointerOverCamelot(event.target);
    },
    [camelotOpen, scheduleDwellOpen, syncPointerOverCamelot],
  );

  const handleBrowserMouseLeave = useCallback(() => {
    clearTimer(dwellTimerRef);
    clearTimer(subgenreDwellRef);
    pointerOnSelectedGenreRef.current = false;
    pointerInsideSubgenreRef.current = false;
    if (camelotOpen) {
      pointerInsideCamelotRef.current = false;
      scheduleCamelotClose();
    }
    if (subgenreOpen) scheduleSubgenreClose();
  }, [camelotOpen, scheduleCamelotClose, scheduleSubgenreClose, subgenreOpen]);

  const handleCamelotMouseEnter = useCallback(() => {
    pointerInsideCamelotRef.current = true;
    cancelCamelotClose();
  }, [cancelCamelotClose]);

  const handleCamelotMouseLeave = useCallback(() => {
    pointerInsideCamelotRef.current = false;
    scheduleCamelotClose();
  }, [scheduleCamelotClose]);

  const handleSubgenreMouseEnter = useCallback(() => {
    pointerInsideSubgenreRef.current = true;
    cancelSubgenreClose();
  }, [cancelSubgenreClose]);

  const handleSubgenreMouseLeave = useCallback(() => {
    pointerInsideSubgenreRef.current = false;
    scheduleSubgenreClose();
  }, [scheduleSubgenreClose]);

  const handleSelectedGenrePointerActivity = useCallback(() => {
    pointerOnSelectedGenreRef.current = true;
    cancelSubgenreClose();
    scheduleSubgenreOpen();
  }, [cancelSubgenreClose, scheduleSubgenreOpen]);

  const handleSelectedGenrePointerLeave = useCallback(() => {
    pointerOnSelectedGenreRef.current = false;
    suppressSubgenreOpenRef.current = false;
    clearTimer(subgenreDwellRef);
    scheduleSubgenreClose();
  }, [scheduleSubgenreClose]);

  /**
   * Fecha o painel de subgênero se ele estiver aberto sobre o gênero já ativo.
   */
  const handleSelectedGenreClick = useCallback(() => {
    if (!subgenreOpenRef.current) return;
    suppressSubgenreOpenRef.current = true;
    closeSubgenrePanel();
  }, [closeSubgenrePanel]);

  const handleSelectGenre = useCallback(
    (genre: GenreResponse | null) => {
      pointerOnSelectedGenreRef.current = genre !== null;
      suppressSubgenreOpenRef.current = false;
      closeSubgenrePanel();
      onSelectGenre(genre);
    },
    [closeSubgenrePanel, onSelectGenre],
  );

  useEffect(() => {
    if (hasSubgenres) return;
    closeSubgenrePanel();
  }, [closeSubgenrePanel, hasSubgenres]);

  useEffect(() => {
    if (!pointerOnSelectedGenreRef.current || !hasSubgenres || subgenreOpen) return;
    scheduleSubgenreOpen();
  }, [hasSubgenres, scheduleSubgenreOpen, subgenreOpen]);

  useEffect(() => {
    if (!camelotOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCamelotPanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camelotOpen, closeCamelotPanel]);

  useEffect(() => {
    if (!subgenreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSubgenrePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSubgenrePanel, subgenreOpen]);

  useEffect(() => {
    if (!camelotOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (camelotAnchorRef.current?.contains(target)) return;
      closeCamelotPanel();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [camelotOpen, closeCamelotPanel]);

  useEffect(
    () => () => {
      clearTimer(dwellTimerRef);
      clearTimer(closeTimerRef);
      clearTimer(subgenreDwellRef);
      clearTimer(subgenreCloseRef);
    },
    [],
  );

  return (
    <section
      ref={browserRef}
      className="collection-browser"
      data-camelot-open={camelotOpen ? "true" : "false"}
      data-subgenre-open={subgenreOpen ? "true" : "false"}
      data-key-filter={browseKeyFilter ?? "all"}
      aria-label="Collection"
      onMouseEnter={handleBrowserMouseEnter}
      onMouseMove={handleBrowserMouseMove}
      onMouseLeave={handleBrowserMouseLeave}
    >
      <div className="collection-sidebar">
        <CollectionModeToggle mode={collectionMode} onChange={onCollectionModeChange} />
        <GenreFilterPanel
          genres={collectionMode ? genres : []}
          selectedName={selectedGenre}
          selectedId={selectedGenreId}
          emptyCopy={collectionMode ? emptyGenreCopy : null}
          hasSubgenres={hasSubgenres}
          subgenrePanelOpen={subgenreOpen}
          onSelectGenre={handleSelectGenre}
          onSelectedGenreClick={handleSelectedGenreClick}
          onSelectedGenrePointerActivity={handleSelectedGenrePointerActivity}
          onSelectedGenrePointerLeave={handleSelectedGenrePointerLeave}
        />
      </div>
      {subgenreOpen && hasSubgenres ? (
        <div
          ref={subgenreAnchorRef}
          className="collection-subgenre-anchor"
          onMouseEnter={handleSubgenreMouseEnter}
          onMouseLeave={handleSubgenreMouseLeave}
        >
          <SubgenreFilterPanel
            subgenres={subgenres}
            selected={selectedSubgenre}
            onSelect={onSelectSubgenre}
            className="collection-subgenre--floating"
          />
        </div>
      ) : null}
      {camelotOpen ? (
        <div
          ref={camelotAnchorRef}
          className="collection-camelot-anchor"
          onMouseEnter={handleCamelotMouseEnter}
          onMouseLeave={handleCamelotMouseLeave}
        >
          <CamelotFilterPanel
            selected={browseKeyFilter}
            onSelect={onSelectCamelot}
            className="collection-camelot--floating"
          />
        </div>
      ) : null}
      <div className="collection-browser-main">
        <CollectionTrackList
          tracks={tracks}
          browseCursor={browseCursor}
          loadedTrackIds={loadedTrackIds}
          libraryLoading={libraryLoading}
          browseIdle={browseIdle}
          browseIdleCopy={browseIdleCopy}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          columnFilters={columnFilters}
          onColumnFiltersChange={onColumnFiltersChange}
          onSelectTrack={onSelectTrack}
          onDropTrack={onDropTrack}
        />
      </div>
    </section>
  );
}
