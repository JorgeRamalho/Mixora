import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import { TRAINING_TRACKS } from "../../data/training-tracks";
import { engine } from "../../lib/audio-engine";
import {
  armDeckFileInput,
  disarmDeckFileInput,
  openDeckFileDialog,
} from "../../lib/deck-file-picker";
import { assertAllowedInReducer } from "../../lib/mixer-assert";
import {
  createBrowseState,
  EMPTY_DECK_KEY_FILTERS,
  filterBrowseTracks,
  loadBrowseSource,
  mapRemoteBrowseTrack,
  masterTrackIndex,
  saveBrowseSource,
  wrapCursor,
} from "../../lib/mixer-browse";
import { applyAbsoluteAction, createMixerDispatch } from "../../lib/mixer-dispatch";
import { cloneMixerSnapshot } from "../../lib/mixer-snapshot";
import { getCamelotKey, normalizeCamelotCode } from "../../lib/musical-key";
import { useMidiController } from "../../lib/midi/use-midi-controller";
import { resetDdj400LedCache, syncDdj400Leds } from "../../lib/midi/ddj-400-led-sync";
import { useDeckRemoteLoad } from "../../lib/tracks-api/hooks/use-deck-remote-load";
import { usePrefetchAdjacentTracks } from "../../lib/tracks-api/hooks/use-prefetch-adjacent";
import { useTrackDetail } from "../../lib/tracks-api/hooks/use-track-detail";
import { useTrackLibrary } from "../../lib/tracks-api/hooks/use-track-library";
import type { CamelotFilterMode } from "../../lib/tracks-api/types";
import type { BrowseSource, DeckId, MixerAction, MixerSnapshot } from "../../types/mixer";
import { BrowseChip } from "./BrowseChip";
import { BrowseSourceToggle } from "./BrowseSourceToggle";
import { CdjCamelotPicker } from "./CdjCamelotPicker";
import { CdjDeck } from "./CdjDeck";
import { DeckPlaylist } from "./DeckPlaylist";
import { MidiStatus } from "./MidiStatus";
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
  return cloneMixerSnapshot(engine.snapshot);
}

export function MixerBoard() {
  const [snap, dispatch] = useReducer(reducer, engine.snapshot, () =>
    cloneMixerSnapshot(engine.snapshot),
  );

  const [browseSource, setBrowseSource] = useState<BrowseSource>(() => loadBrowseSource());
  const [browseKeyFilterByDeck, setBrowseKeyFilterByDeck] = useState(EMPTY_DECK_KEY_FILTERS);
  const [browseCamelotMode, setBrowseCamelotMode] = useState<CamelotFilterMode>("compatible");
  const [camelotPickerDeck, setCamelotPickerDeck] = useState<DeckId | null>(null);
  const [keyFilterFlashByDeck, setKeyFilterFlashByDeck] = useState<Record<DeckId, number>>({ a: 0, b: 0 });

  const libraryA = useTrackLibrary(browseSource, {
    camelot: browseKeyFilterByDeck.a,
    camelotMode: browseCamelotMode,
  });
  const libraryB = useTrackLibrary(browseSource, {
    camelot: browseKeyFilterByDeck.b,
    camelotMode: browseCamelotMode,
  });
  const remote = useDeckRemoteLoad(engine);

  const localCatalog = useMemo(
    () =>
      TRAINING_TRACKS.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        key: track.key,
      })),
    [],
  );

  const browseTracksByDeck = useMemo(
    () => {
      if (browseSource === "local") {
        return {
          a: filterBrowseTracks(localCatalog, browseKeyFilterByDeck.a, browseCamelotMode),
          b: filterBrowseTracks(localCatalog, browseKeyFilterByDeck.b, browseCamelotMode),
        };
      }
      return {
        a: (libraryA.data?.tracks ?? []).map(mapRemoteBrowseTrack),
        b: (libraryB.data?.tracks ?? []).map(mapRemoteBrowseTrack),
      };
    },
    [
      browseCamelotMode,
      browseKeyFilterByDeck,
      browseSource,
      libraryA.data?.tracks,
      libraryB.data?.tracks,
      localCatalog,
    ],
  );

  const [cursorByDeck, setCursorByDeck] = useState<Record<DeckId, number>>(() => ({
    a: masterTrackIndex(
      engine.snapshot,
      TRAINING_TRACKS.map((track) => track.id),
    ),
    b: masterTrackIndex(
      engine.snapshot,
      TRAINING_TRACKS.map((track) => track.id),
    ),
  }));
  const [pendingLoad, setPendingLoad] = useState<DeckId | null>(null);

  const cursorRef = useRef(cursorByDeck);
  const browseSourceRef = useRef(browseSource);
  const masterDeckRef = useRef(snap.masterDeck);
  const dispatchActionRef = useRef<ReturnType<typeof createMixerDispatch> | null>(null);

  masterDeckRef.current = snap.masterDeck;

  const camelotPickerDeckRef = useRef<DeckId | null>(null);
  camelotPickerDeckRef.current = camelotPickerDeck;

  const changeBrowseSource = useCallback((source: BrowseSource) => {
    saveBrowseSource(source);
    browseSourceRef.current = source;
    setBrowseSource(source);
    cursorRef.current = { a: 0, b: 0 };
    setCursorByDeck({ a: 0, b: 0 });
    setBrowseKeyFilterByDeck(EMPTY_DECK_KEY_FILTERS);
    setBrowseCamelotMode("compatible");
    setCamelotPickerDeck(null);
  }, []);

  const openCamelotPicker = useCallback((deckId: DeckId) => {
    disarmDeckFileInput();
    setPendingLoad(null);
    setCamelotPickerDeck(deckId);
  }, []);

  const closeCamelotPicker = useCallback(() => {
    setCamelotPickerDeck(null);
  }, []);

  const applyBrowseKeyFilter = useCallback((code: string) => {
    const deckId = camelotPickerDeckRef.current;
    if (deckId === null) return;
    const normalized = normalizeCamelotCode(code) ?? code;
    setBrowseKeyFilterByDeck((current) => ({ ...current, [deckId]: normalized }));
    cursorRef.current = { ...cursorRef.current, [deckId]: 0 };
    setCursorByDeck((current) => ({ ...current, [deckId]: 0 }));
    setCamelotPickerDeck(null);
    setKeyFilterFlashByDeck((current) => ({ ...current, [deckId]: current[deckId] + 1 }));
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

  const browseByDeck = useMemo(
    () => ({
      a: createBrowseState({
        tracks: browseTracksByDeck.a,
        getCursor: () => cursorRef.current.a,
        setCursor: (index) => {
          cursorRef.current = { ...cursorRef.current, a: index };
          setCursorByDeck((current) => ({ ...current, a: index }));
        },
        snapshot: () => engine.snapshot,
      }),
      b: createBrowseState({
        tracks: browseTracksByDeck.b,
        getCursor: () => cursorRef.current.b,
        setCursor: (index) => {
          cursorRef.current = { ...cursorRef.current, b: index };
          setCursorByDeck((current) => ({ ...current, b: index }));
        },
        snapshot: () => engine.snapshot,
      }),
    }),
    [browseTracksByDeck],
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
   * mesmo union em vez de fluxos separados.
   */
  const dispatchAction = useMemo(
    () =>
      createMixerDispatch({
        eng: engine,
        browseByDeck,
        getMasterDeck: () => masterDeckRef.current,
        dispatchReducer: dispatch,
        getBrowseSource: () => browseSourceRef.current,
        onUiOp: (op) => {
          if (op.kind === "openFilePicker") openDeckPicker(op.deckId);
          if (op.kind === "armFilePicker") armDeckPicker(op.deckId);
          if (op.kind === "showLoadError") window.alert(op.message);
          if (op.kind === "loadRemoteTrack") void handleRemoteLoad(op.deckId, op.trackId);
        },
      }),
    [armDeckPicker, browseByDeck, handleRemoteLoad, openDeckPicker],
  );

  dispatchActionRef.current = dispatchAction;

  const midi = useMidiController(dispatchAction);
  const masterKey = snap[snap.masterDeck].track.key;
  const masterDeck = snap.masterDeck;
  const masterBrowseTracks = browseTracksByDeck[masterDeck];
  const safeCursorByDeck = {
    a: wrapCursor(cursorByDeck.a, browseTracksByDeck.a.length),
    b: wrapCursor(cursorByDeck.b, browseTracksByDeck.b.length),
  };
  const safeMasterCursor = safeCursorByDeck[masterDeck];
  const browseTrack = masterBrowseTracks[safeMasterCursor] ?? null;
  const camelotPickerSelected =
    camelotPickerDeck === null
      ? "8A"
      : normalizeCamelotCode(snap[camelotPickerDeck].track.key) ??
        browseKeyFilterByDeck[camelotPickerDeck] ??
        "8A";
  const libraryLoadingByDeck = {
    a: browseSource === "remote" && libraryA.isLoading && !libraryA.data,
    b: browseSource === "remote" && libraryB.isLoading && !libraryB.data,
  };
  const libraryLoading = libraryLoadingByDeck.a || libraryLoadingByDeck.b;
  const libraryError = libraryA.isError || libraryB.isError;
  const remoteIds = useMemo(() => {
    if (browseSource !== "remote") return [];
    const masterTracks =
      masterDeck === "a" ? libraryA.data?.tracks : libraryB.data?.tracks;
    return masterTracks ?? [];
  }, [browseSource, masterDeck, libraryA.data?.tracks, libraryB.data?.tracks]);
  const boardStyle = useMemo(
    () =>
      ({
        "--camelot-a": getCamelotKey(snap.a.track.key)?.color ?? "#8b8fa8",
        "--camelot-b": getCamelotKey(snap.b.track.key)?.color ?? "#8b8fa8",
      }) as CSSProperties,
    [snap.a.track.key, snap.b.track.key],
  );

  usePrefetchAdjacentTracks(remoteIds, safeMasterCursor);
  useTrackDetail(browseSource === "remote" ? (browseTrack?.id ?? null) : null);
  const { markPainted } = midi;

  useLayoutEffect(() => {
    markPainted();
    syncDdj400Leds(snap);
  }, [snap, markPainted]);

  useEffect(() => {
    if (midi.status === "connected") return;
    resetDdj400LedCache();
  }, [midi.status]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (engine.snapshot.a.playing || engine.snapshot.b.playing) {
        dispatch({ type: "refresh" });
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => disarmDeckFileInput(), []);

  return (
    <div className="mixer-cabinet" data-browse-source={browseSource}>
      <div className="mixer-stage" data-stage="4">
        <DeckPlaylist
          deckId="a"
          side="left"
          tracks={browseTracksByDeck.a}
          loadedTrackId={snap.a.track.id}
          browseCursor={safeCursorByDeck.a}
          browseSource={browseSource}
          libraryLoading={libraryLoadingByDeck.a}
          browseKeyFilter={browseKeyFilterByDeck.a}
          keyFilterFlash={keyFilterFlashByDeck.a}
          camelotColor={getCamelotKey(snap.a.track.key)?.color ?? "#8b8fa8"}
          onSelectTrack={(trackId) => {
            if (browseSource === "remote") {
              dispatchAction({ type: "loadRemoteTrack", id: "a", trackId });
              return;
            }
            dispatchAction({ type: "loadTrack", id: "a", trackId });
          }}
        />

        <div className="mixer-board" style={boardStyle}>
          <header className="mixer-cabinet-head">
            <BrowseSourceToggle value={browseSource} onChange={changeBrowseSource} />
            {pendingLoad ? (
              <p className="mixer-board-message mixer-board-message--pending" role="status">
                LOAD na DDJ-400: clique na tela para escolher o áudio do deck{" "}
                {pendingLoad.toUpperCase()}.
              </p>
            ) : null}
            {libraryError ? (
              <p className="mixer-board-message mixer-board-message--error" role="alert">
                Não foi possível listar a biblioteca remota. Confira o MusicDiscover em
                http://127.0.0.1:8765 ou volte ao USB de treino.
              </p>
            ) : null}
            <BrowseChip
              track={browseTrack}
              position={safeMasterCursor + 1}
              total={masterBrowseTracks.length}
              source={browseSource}
              loading={libraryLoading}
            />
            <MidiStatus
              status={midi.status}
              deviceName={midi.deviceName}
              ports={midi.ports}
              lastHeard={midi.lastHeard}
              error={midi.error}
              live={midi.live}
              latency={midi.latency}
              onConnect={midi.connect}
            />
          </header>
          <CdjDeck
            id="a"
            masterKey={masterKey}
            loadPending={pendingLoad === "a"}
            browseSource={browseSource}
            libraryLoading={libraryLoadingByDeck.a}
            browseKeyFilter={browseKeyFilterByDeck.a}
            onKeyMetricClick={() => openCamelotPicker("a")}
            remoteLoad={remote.byDeck.a}
            onRetryRemote={() => {
              void remote.retry("a").then((ok) => {
                if (ok) dispatch({ type: "refresh" });
              });
            }}
            onLoadPrepare={prepareDeckLoad}
            onFile={(file) => handleDeckFile("a", file)}
            onChange={dispatchAction}
          />
          <MixerConsole snap={snap} onChange={dispatchAction} />
          <CdjDeck
            id="b"
            masterKey={masterKey}
            loadPending={pendingLoad === "b"}
            browseSource={browseSource}
            libraryLoading={libraryLoadingByDeck.b}
            browseKeyFilter={browseKeyFilterByDeck.b}
            onKeyMetricClick={() => openCamelotPicker("b")}
            remoteLoad={remote.byDeck.b}
            onRetryRemote={() => {
              void remote.retry("b").then((ok) => {
                if (ok) dispatch({ type: "refresh" });
              });
            }}
            onLoadPrepare={prepareDeckLoad}
            onFile={(file) => handleDeckFile("b", file)}
            onChange={dispatchAction}
          />
        </div>

        <DeckPlaylist
          deckId="b"
          side="right"
          tracks={browseTracksByDeck.b}
          loadedTrackId={snap.b.track.id}
          browseCursor={safeCursorByDeck.b}
          browseSource={browseSource}
          libraryLoading={libraryLoadingByDeck.b}
          browseKeyFilter={browseKeyFilterByDeck.b}
          keyFilterFlash={keyFilterFlashByDeck.b}
          camelotColor={getCamelotKey(snap.b.track.key)?.color ?? "#8b8fa8"}
          onSelectTrack={(trackId) => {
            if (browseSource === "remote") {
              dispatchAction({ type: "loadRemoteTrack", id: "b", trackId });
              return;
            }
            dispatchAction({ type: "loadTrack", id: "b", trackId });
          }}
        />
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
