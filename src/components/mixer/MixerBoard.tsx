import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { engine } from "../../lib/audio-engine";
import {
  armDeckFileInput,
  disarmDeckFileInput,
  openDeckFileDialog,
} from "../../lib/deck-file-picker";
import { assertAllowedInReducer } from "../../lib/mixer-assert";
import {
  createBrowseState,
  mapRemoteBrowseTrack,
  wrapCursor,
} from "../../lib/mixer-browse";
import {
  filterTracksByCollectionColumns,
  resolveCollectionLibraryQuery,
} from "../../lib/collection-column-filters";
import {
  getBrowseSessionSnapshot,
  seedBrowseSessionIfPristine,
  setBrowseCursor,
  setCollectionColumnFilters,
  subscribeBrowseSession,
  updateBrowseSession,
} from "../../lib/mixer-browse-session";
import { applyAbsoluteAction, createMixerDispatch } from "../../lib/mixer-dispatch";
import { notifyMixerSnapshotChange } from "../../lib/mixer-snapshot-store";
import { cloneMixerSnapshot } from "../../lib/mixer-snapshot";
import { normalizeCamelotCode } from "../../lib/musical-key";
import {
  mixerStagePaletteCssVars,
  resolveMixerStagePalette,
} from "../../lib/mixer-stage-palette";
import { useCueAudioRouting } from "../../lib/use-cue-audio-routing";
import { useMidiController } from "../../lib/midi/use-midi-controller";
import { requestLedSync, resetDdj400LedCache } from "../../lib/midi/ddj-400-led-sync";
import { useDeckRemoteLoad } from "../../lib/tracks-api/hooks/use-deck-remote-load";
import { useGenreTaxonomy, useSubgenreTaxonomy } from "../../lib/tracks-api/hooks/use-genre-taxonomy";
import { usePrefetchAdjacentTracks } from "../../lib/tracks-api/hooks/use-prefetch-adjacent";
import { useTrackDetail } from "../../lib/tracks-api/hooks/use-track-detail";
import {
  canFetchRemoteCollection,
  remoteCollectionIdleCopy,
  useTrackLibrary,
} from "../../lib/tracks-api/hooks/use-track-library";
import type { GenreResponse } from "../../lib/tracks-api/types";
import type { DeckId, MixerAction, MixerSnapshot, RemoteCollectionMode } from "../../types/mixer";
import { CdjCamelotPicker } from "./CdjCamelotPicker";
import { CdjDeck } from "./CdjDeck";
import { CollectionBrowser } from "./CollectionBrowser";
import { MasterWaveforms } from "./MasterWaveforms";
import { MixerChromeBridge } from "./MixerChromeBridge";
import { MixerConsole } from "./MixerConsole";

/**
 * Aplica a ação no engine e devolve um clone do snapshot para o React.
 *
 * O reducer **não** é puro, porque o engine muta o grafo de áudio. O
 * StrictMode invoca reducers duas vezes, e por isso intenções nunca entram
 * aqui: elas nascem no `createMixerDispatch` e só chegam como absolutas ou
 * como `refresh`.
 *
 * @param _state Snapshot anterior, ignorado porque a fonte da verdade é o engine.
 * @param action Ação absoluta ou `refresh`.
 */
function reducer(_state: MixerSnapshot, action: MixerAction): MixerSnapshot {
  assertAllowedInReducer(action);
  applyAbsoluteAction(engine, action);
  const next = cloneMixerSnapshot(engine.snapshot);
  notifyMixerSnapshotChange();
  return next;
}

/** Fonte fixa da collection: a cabine só lista a biblioteca da API. */
const LIBRARY_BROWSE_SOURCE = "remote" as const;

export function MixerBoard() {
  const [snap, dispatchBase] = useReducer(reducer, engine.snapshot, () =>
    cloneMixerSnapshot(engine.snapshot),
  );

  /**
   * Único caminho que atualiza o React depois de mutar o engine, e já agenda o
   * espelho dos LEDs a partir do engine — nunca do snap React, que pode atrasar.
   */
  const dispatch = useCallback((action: MixerAction) => {
    dispatchBase(action);
    requestLedSync();
  }, []);

  const browseSession = useSyncExternalStore(
    subscribeBrowseSession,
    getBrowseSessionSnapshot,
    getBrowseSessionSnapshot,
  );
  const {
    cursor,
    collectionMode,
    genreFilter,
    genreId,
    subgenreFilter,
    columnFilters,
    browseKeyFilter,
    browseCamelotMode,
  } = browseSession;
  const [camelotPickerDeck, setCamelotPickerDeck] = useState<DeckId | null>(null);
  const columnQuery = useMemo(
    () => resolveCollectionLibraryQuery(columnFilters),
    [columnFilters],
  );
  const libraryCamelot = browseKeyFilter ?? columnQuery.columnCamelot;
  const libraryCamelotMode = browseKeyFilter
    ? browseCamelotMode
    : columnQuery.columnCamelot
      ? "exact"
      : browseCamelotMode;

  const libraryFilters = {
    collectionMode,
    artist: columnQuery.artist,
    track: columnQuery.track,
    release: columnQuery.release,
    label: columnQuery.label,
    genreId,
    camelot: libraryCamelot,
    camelotMode: libraryCamelotMode,
    genre: genreFilter,
    subgenre: subgenreFilter,
    bpmMin: columnQuery.bpmMin ?? null,
    bpmMax: columnQuery.bpmMax ?? null,
  };
  const browseIdle = !canFetchRemoteCollection(libraryFilters);
  const browseIdleCopy = remoteCollectionIdleCopy(libraryFilters);
  const library = useTrackLibrary(LIBRARY_BROWSE_SOURCE, libraryFilters);
  const remoteGenres = useGenreTaxonomy(LIBRARY_BROWSE_SOURCE, collectionMode);
  const remoteSubgenres = useSubgenreTaxonomy(LIBRARY_BROWSE_SOURCE, collectionMode, genreId);
  const remote = useDeckRemoteLoad(engine);

  const browseTracks = useMemo(() => {
    const pages = library.data?.pages ?? [];
    const mapped = pages.flatMap((page) => page.tracks.map(mapRemoteBrowseTrack));
    return filterTracksByCollectionColumns(mapped, columnFilters);
  }, [columnFilters, library.data?.pages]);

  const genres = remoteGenres.data?.genres ?? [];
  const subgenres = remoteSubgenres.data?.subgenres ?? [];
  const emptyGenreCopy =
    collectionMode !== null && !remoteGenres.isLoading && genres.length === 0
      ? "Nenhum gênero sincronizado. Rode discover sync genres."
      : null;

  const [pendingLoad, setPendingLoad] = useState<DeckId | null>(null);

  const cursorRef = useRef(cursor);
  const dispatchActionRef = useRef<ReturnType<typeof createMixerDispatch> | null>(null);

  cursorRef.current = cursor;

  const camelotPickerDeckRef = useRef<DeckId | null>(null);
  camelotPickerDeckRef.current = camelotPickerDeck;

  const openCamelotPicker = useCallback((deckId: DeckId) => {
    disarmDeckFileInput();
    setPendingLoad(null);
    setCamelotPickerDeck(deckId);
  }, []);

  const closeCamelotPicker = useCallback(() => {
    setCamelotPickerDeck(null);
  }, []);

  const applyBrowseKeyFilter = useCallback((code: string) => {
    const normalized = normalizeCamelotCode(code) ?? code;
    updateBrowseSession({
      browseKeyFilter: normalized,
      cursor: 0,
    });
    setCamelotPickerDeck(null);
  }, []);

  const prepareDeckLoad = useCallback(() => {
    disarmDeckFileInput();
    setPendingLoad(null);
  }, []);

  const handleDeckFile = useCallback((deckId: DeckId, file: File) => {
    setPendingLoad(null);
    dispatchActionRef.current?.({ type: "loadDeckFile", id: deckId, file });
  }, []);

  const openDeckPicker = useCallback(
    (deckId: DeckId) => {
      prepareDeckLoad();
      void openDeckFileDialog(deckId, (file) => handleDeckFile(deckId, file));
    },
    [handleDeckFile, prepareDeckLoad],
  );

  const armDeckPicker = useCallback(
    (deckId: DeckId) => {
      armDeckFileInput(deckId, handleDeckFile, {
        onArm: () => setPendingLoad(deckId),
        onDisarm: () => setPendingLoad(null),
      });
    },
    [handleDeckFile],
  );

  const browse = useMemo(
    () =>
      createBrowseState({
        tracks: browseTracks,
        getCursor: () => cursorRef.current,
        setCursor: (index) => {
          cursorRef.current = index;
          setBrowseCursor(index);
        },
        snapshot: () => engine.snapshot,
      }),
    [browseTracks],
  );

  const handleRemoteLoad = useCallback(
    async (deckId: DeckId, trackId: string) => {
      const ok = await remote.load(deckId, trackId);
      if (ok) dispatch({ type: "refresh" });
    },
    [remote.load],
  );

  /**
   * Caminho único de ação da cabine, para o mouse e a DDJ-400 emitirem o
   * mesmo union em vez de fluxos separados. O cue dispara `requestLedSync`
   * na hora, com force, para o LED não esperar o refresh do React.
   */
  const dispatchAction = useMemo(
    () =>
      createMixerDispatch({
        eng: engine,
        browse,
        dispatchReducer: dispatch,
        syncLedsOnCue: () => requestLedSync({ force: true }),
        getBrowseSource: () => LIBRARY_BROWSE_SOURCE,
        onUiOp: (op) => {
          if (op.kind === "openFilePicker") openDeckPicker(op.deckId);
          if (op.kind === "armFilePicker") armDeckPicker(op.deckId);
          if (op.kind === "showLoadError") window.alert(op.message);
          if (op.kind === "loadRemoteTrack") void handleRemoteLoad(op.deckId, op.trackId);
        },
      }),
    [armDeckPicker, browse, dispatch, handleRemoteLoad, openDeckPicker],
  );

  dispatchActionRef.current = dispatchAction;

  const midi = useMidiController(dispatchAction);
  const cueAudio = useCueAudioRouting(midi.status === "connected");
  const masterKey = snap[snap.masterDeck].track.key;
  const safeCursor = wrapCursor(cursor, browseTracks.length);
  const browseTrack = browseTracks[safeCursor] ?? null;
  const camelotPickerSelected =
    camelotPickerDeck === null
      ? "8A"
      : normalizeCamelotCode(snap[camelotPickerDeck].track.key) ?? browseKeyFilter ?? "8A";
  const libraryLoading = library.isLoading && !library.data;
  const loadingMore = library.isFetchingNextPage;
  const hasMoreTracks = Boolean(library.hasNextPage);
  const handleLoadMore = useCallback(() => {
    if (!library.hasNextPage || library.isFetchingNextPage) return;
    void library.fetchNextPage();
  }, [library.fetchNextPage, library.hasNextPage, library.isFetchingNextPage]);
  const remoteIds = useMemo(
    () => (library.data?.pages ?? []).flatMap((page) => page.tracks),
    [library.data?.pages],
  );
  const loadedTrackIds = useMemo(() => [snap.a.track.id, snap.b.track.id], [snap.a.track.id, snap.b.track.id]);
  const stagePalette = useMemo(
    () =>
      resolveMixerStagePalette({
        keyA: snap.a.track.key,
        keyB: snap.b.track.key,
        playingA: snap.a.playing,
        playingB: snap.b.playing,
        crossfader: snap.crossfader,
      }),
    [snap.a.playing, snap.a.track.key, snap.b.playing, snap.b.track.key, snap.crossfader],
  );
  const cabinetStyle = useMemo(
    () => mixerStagePaletteCssVars(stagePalette) as CSSProperties,
    [stagePalette],
  );

  usePrefetchAdjacentTracks(remoteIds, safeCursor);
  useTrackDetail(browseTrack?.id ?? null);
  const { markPainted } = midi;

  useLayoutEffect(() => {
    markPainted();
  }, [snap, markPainted]);

  useEffect(() => {
    if (midi.status === "connected") {
      resetDdj400LedCache();
      requestLedSync({ force: true });
      return;
    }
    resetDdj400LedCache();
  }, [midi.status]);

  useEffect(() => {
    dispatch({ type: "refresh" });
  }, [dispatch]);

  useEffect(() => {
    if (!import.meta.hot) return;
    const resyncAfterHmr = () => {
      dispatch({ type: "refresh" });
    };
    import.meta.hot.on("vite:afterUpdate", resyncAfterHmr);
    return () => {
      import.meta.hot?.off("vite:afterUpdate", resyncAfterHmr);
    };
  }, [dispatch]);

  useEffect(() => {
    return engine.subscribePlaying(() => {
      dispatch({ type: "refresh" });
    });
  }, [dispatch]);

  useEffect(() => () => disarmDeckFileInput(), []);

  useEffect(() => {
    seedBrowseSessionIfPristine(0);
  }, []);

  /**
   * Clique na linha só posiciona o cursor compartilhado.
   *
   * @param trackId Faixa clicada na collection.
   */
  const handleSelectTrack = useCallback(
    (trackId: string) => {
      const index = browseTracks.findIndex((track) => track.id === trackId);
      if (index >= 0) setBrowseCursor(index);
    },
    [browseTracks],
  );

  /**
   * Drop ou MIDI LOAD carrega a faixa no deck destino.
   *
   * @param deckId Destino A ou B.
   * @param trackId Faixa arrastada ou do cursor.
   */
  const handleDropTrack = useCallback(
    (deckId: DeckId, trackId: string) => {
      dispatchAction({ type: "loadRemoteTrack", id: deckId, trackId });
    },
    [dispatchAction],
  );

  /**
   * Ativa um chip de gênero e zera subgênero e cursor.
   *
   * @param genre Chip escolhido, ou null para Todos.
   */
  const handleSelectGenre = useCallback((genre: GenreResponse | null) => {
    updateBrowseSession({
      genreFilter: genre?.name ?? null,
      genreId: genre?.id ?? null,
      subgenreFilter: null,
      cursor: 0,
    });
  }, []);

  const handleCollectionModeChange = useCallback((mode: RemoteCollectionMode | null) => {
    updateBrowseSession({
      collectionMode: mode,
      genreFilter: null,
      genreId: null,
      subgenreFilter: null,
      cursor: 0,
    });
  }, []);

  const handleSelectCamelot = useCallback((code: string | null) => {
    updateBrowseSession({
      browseKeyFilter: code ? (normalizeCamelotCode(code) ?? code) : null,
      cursor: 0,
    });
  }, []);

  /**
   * Aplica o recorte AND digitado sob o header da collection.
   *
   * @param filters Texto das colunas Artista, Faixa, Álbum, BPM, Camelot e Label.
   */
  const handleColumnFiltersChange = useCallback((filters: typeof columnFilters) => {
    setCollectionColumnFilters(filters);
  }, []);

  return (
    <div
      className="mixer-cabinet"
      data-browse-source={LIBRARY_BROWSE_SOURCE}
      data-browse-cursor={String(safeCursor)}
      data-browse-total={String(browseTracks.length)}
      data-playing={stagePalette.playing ? "true" : "false"}
      style={cabinetStyle}
    >
      <MixerChromeBridge
        midiStatus={midi.status}
        midiDeviceName={midi.deviceName}
        midiPorts={midi.ports}
        midiLastHeard={midi.lastHeard}
        midiError={midi.error}
        midiLive={midi.live}
        midiLatency={midi.latency}
        camelot={stagePalette}
        cueAudio={cueAudio}
        onConnectMidi={midi.connect}
      />
      <div className="mixer-stage" data-stage="4">
        <div className="mixer-board">
          <MasterWaveforms />
          <div className="mixer-board-decks">
            <CdjDeck
              id="a"
              masterKey={masterKey}
              midiConnected={midi.status === "connected"}
              loadPending={pendingLoad === "a"}
              libraryLoading={libraryLoading}
              browseKeyFilter={browseKeyFilter}
              onKeyMetricClick={() => openCamelotPicker("a")}
              remoteLoad={remote.byDeck.a}
              onRetryRemote={() => {
                void remote.retry("a").then((ok) => {
                  if (ok) dispatch({ type: "refresh" });
                });
              }}
              onFile={(file) => handleDeckFile("a", file)}
              onChange={dispatchAction}
            />
            <MixerConsole snap={snap} onChange={dispatchAction} />
            <CdjDeck
              id="b"
              masterKey={masterKey}
              midiConnected={midi.status === "connected"}
              loadPending={pendingLoad === "b"}
              libraryLoading={libraryLoading}
              browseKeyFilter={browseKeyFilter}
              onKeyMetricClick={() => openCamelotPicker("b")}
              remoteLoad={remote.byDeck.b}
              onRetryRemote={() => {
                void remote.retry("b").then((ok) => {
                  if (ok) dispatch({ type: "refresh" });
                });
              }}
              onFile={(file) => handleDeckFile("b", file)}
              onChange={dispatchAction}
            />
          </div>
          <CollectionBrowser
            tracks={browseTracks}
            browseCursor={safeCursor}
            loadedTrackIds={loadedTrackIds}
            libraryLoading={libraryLoading}
            browseIdle={browseIdle}
            browseIdleCopy={browseIdleCopy}
            loadingMore={loadingMore}
            hasMore={hasMoreTracks}
            onLoadMore={handleLoadMore}
            collectionMode={collectionMode}
            onCollectionModeChange={handleCollectionModeChange}
            genres={genres}
            selectedGenre={genreFilter}
            selectedGenreId={genreId}
            subgenres={subgenres}
            selectedSubgenre={subgenreFilter}
            emptyGenreCopy={emptyGenreCopy}
            onSelectGenre={handleSelectGenre}
            onSelectSubgenre={(name) => updateBrowseSession({ subgenreFilter: name, cursor: 0 })}
            browseKeyFilter={browseKeyFilter}
            onSelectCamelot={handleSelectCamelot}
            columnFilters={columnFilters}
            onColumnFiltersChange={handleColumnFiltersChange}
            onSelectTrack={handleSelectTrack}
            onDropTrack={handleDropTrack}
          />
        </div>
      </div>

      <CdjCamelotPicker
        open={camelotPickerDeck !== null}
        deckId={camelotPickerDeck ?? "a"}
        selected={camelotPickerSelected}
        onSelect={applyBrowseKeyFilter}
        onDismiss={closeCamelotPicker}
      />
    </div>
  );
}
