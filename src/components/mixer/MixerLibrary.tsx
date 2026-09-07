import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { MixerTrackDrag } from "../../lib/mixer-track-drag";
import type { DeckId, TrainingTrack } from "../../types";

const CRATE_TABS = [
  { id: "usb", label: "USB" },
  { id: "treino", label: "TREINO MIXORA" },
  { id: "browse", label: "BROWSE" },
] as const;

const CRATE_PATH = ["USB", "TREINO", "BIBLIOTECA", "ART"] as const;

function filterCrateTracks(tracks: readonly TrainingTrack[], query: string): TrainingTrack[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...tracks];
  return tracks.filter((track) =>
    [track.title, track.artist, track.genre, track.key, String(track.bpm)].join(" ").toLowerCase().includes(needle),
  );
}

function CrateTrackRow({
  track,
  panelDeck,
  selected,
  loaded,
  dragging,
  onPointerDown,
  onLoad,
}: {
  track: TrainingTrack;
  panelDeck: DeckId;
  selected: boolean;
  loaded: boolean;
  dragging: boolean;
  onPointerDown: (track: TrainingTrack, event: ReactPointerEvent) => void;
  onLoad: (deckId: DeckId, trackId: string) => void;
}) {
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onLoad(panelDeck, track.id);
  };

  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={selected}
      aria-label={`${track.title}, ${track.artist}, ${track.bpm} BPM, tom ${track.key}. Arraste para um deck ou Enter para carregar no Deck ${panelDeck.toUpperCase()}`}
      className="mixer-crate-track"
      data-track-id={track.id}
      data-selected={selected ? "true" : "false"}
      data-loaded={loaded ? "true" : "false"}
      data-dragging={dragging ? "true" : "false"}
      onPointerDown={(event) => onPointerDown(track, event)}
      onDoubleClick={() => onLoad(panelDeck, track.id)}
      onKeyDown={onKeyDown}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className="mixer-crate-track-title">{track.title}</span>
      <span className="mixer-crate-track-artist">{track.artist}</span>
      <span className="mixer-crate-track-meta">
        {track.bpm} BPM · {track.key}
      </span>
    </div>
  );
}

function PlaylistPanel({
  deckId,
  tracks,
  cursorId,
  loadedId,
  drag,
  onPointerDown,
  onLoad,
}: {
  deckId: DeckId;
  tracks: readonly TrainingTrack[];
  cursorId: string | undefined;
  loadedId: string;
  drag: MixerTrackDrag | null;
  onPointerDown: (track: TrainingTrack, event: ReactPointerEvent) => void;
  onLoad: (deckId: DeckId, trackId: string) => void;
}) {
  const label = `DECK ${deckId.toUpperCase()}`;

  return (
    <section className="mixer-crate-panel" data-crate-deck={deckId} aria-label={`Playlist ${label}`}>
      <header className="mixer-crate-panel-head">
        <p className="mixer-crate-panel-title">{label}</p>
        <nav className="mixer-crate-tabs" aria-label={`Fonte da biblioteca ${label}`}>
          {CRATE_TABS.map((tab) => (
            <span
              key={tab.id}
              className={tab.id === "treino" ? "mixer-crate-tab is-on" : "mixer-crate-tab"}
            >
              {tab.label}
            </span>
          ))}
        </nav>
      </header>
      <p className="mixer-crate-path" aria-hidden="true">
        USB <span>›</span> TREINO MIXORA <span>›</span> BROWSE
      </p>
      <div className="mixer-crate-list" role="listbox" aria-label={`Faixas ${label}`}>
        {tracks.length === 0 ? (
          <p className="mixer-crate-empty">Nenhuma faixa nesta busca.</p>
        ) : (
          tracks.map((track) => (
            <CrateTrackRow
              key={`${deckId}-${track.id}`}
              track={track}
              panelDeck={deckId}
              selected={cursorId === track.id}
              loaded={loadedId === track.id}
              dragging={drag?.active === true && drag.trackId === track.id}
              onPointerDown={onPointerDown}
              onLoad={onLoad}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function MixerCrateBar({
  search,
  browseTrack,
  onSearch,
}: {
  search: string;
  browseTrack: TrainingTrack | undefined;
  onSearch: (value: string) => void;
}) {
  return (
    <div className="mixer-crate-bar">
      <nav className="mixer-crate-crumbs" aria-label="Caminho da biblioteca USB">
        {CRATE_PATH.map((crumb, index) => (
          <span key={crumb} className="mixer-crate-crumb">
            {index > 0 ? <span className="mixer-crate-crumb-sep" aria-hidden="true">›</span> : null}
            {crumb}
          </span>
        ))}
        {browseTrack ? (
          <span className="mixer-crate-folder">{browseTrack.title}</span>
        ) : null}
      </nav>
      <label className="mixer-crate-search">
        <span className="visually-hidden">Buscar na biblioteca USB</span>
        <input
          type="search"
          value={search}
          placeholder="Buscar faixa, artista ou tom"
          aria-label="Buscar na biblioteca USB"
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <p className="mixer-crate-hint">Clique e arraste a faixa para o Deck A ou o Deck B</p>
    </div>
  );
}

export function MixerPlaylistDock({
  tracks,
  search,
  cursor,
  loadedA,
  loadedB,
  drag,
  onPointerDown,
  onLoad,
}: {
  tracks: readonly TrainingTrack[];
  search: string;
  cursor: number;
  loadedA: string;
  loadedB: string;
  drag: MixerTrackDrag | null;
  onPointerDown: (track: TrainingTrack, event: ReactPointerEvent) => void;
  onLoad: (deckId: DeckId, trackId: string) => void;
}) {
  const visible = filterCrateTracks(tracks, search);
  const cursorId = tracks[cursor]?.id;

  return (
    <div className="mixer-playlist-dock">
      <PlaylistPanel
        deckId="a"
        tracks={visible}
        cursorId={cursorId}
        loadedId={loadedA}
        drag={drag}
        onPointerDown={onPointerDown}
        onLoad={onLoad}
      />
      <PlaylistPanel
        deckId="b"
        tracks={visible}
        cursorId={cursorId}
        loadedId={loadedB}
        drag={drag}
        onPointerDown={onPointerDown}
        onLoad={onLoad}
      />
    </div>
  );
}
