import { useEffect, useMemo, type CSSProperties } from "react";
import { PLATFORMS } from "../../data/platforms";
import { RADIO_PLATFORM_STATION_TYPES } from "../../data/radio";
import { getCamelotKey } from "../../lib/musical-key";
import { getUpcomingClips } from "../../lib/radio-playlist";
import { radioMp3Station } from "../../lib/radio-mp3-station";
import { useRadioMp3 } from "../../lib/use-radio-mp3";
import type { RadioClip, RadioSource } from "../../types/radio";
import type { PlatformId } from "../../types/platform";
import { RadioLiveStage } from "./RadioLiveStage";
import { RadioVirtualDisplay } from "./RadioVirtualDisplay";

type RadioDjPlayerProps = {
  clips: RadioClip[];
  source: RadioSource;
  catalogReady: boolean;
  accent: string;
  playlistIds: string[];
  playlistOnly: boolean;
  onPlaylistOnlyChange: (value: boolean) => void;
  onCatalogUpdated: () => void;
  onTogglePlaylistClip: (clipId: string) => void;
  onSelectClip: (clip: RadioClip, options?: { autoplay?: boolean }) => void;
  onToggleContinuous: () => void;
};

const platformById = new Map(PLATFORMS.map((platform) => [platform.id, platform]));

function platformLabel(id: PlatformId): string {
  if (id === "youtube") return "YouTube Music";
  return platformById.get(id)?.name ?? id;
}

export function RadioDjPlayer({
  clips,
  source,
  catalogReady,
  accent,
  playlistIds,
  playlistOnly,
  onPlaylistOnlyChange,
  onCatalogUpdated,
  onTogglePlaylistClip,
  onSelectClip,
  onToggleContinuous,
}: RadioDjPlayerProps) {
  const mp3 = useRadioMp3();
  const activeClip = source.kind === "clip" ? (mp3.clip ?? source.clip) : null;
  const continuous = source.kind === "clip" && source.continuous;
  const playing = mp3.playing;
  const paused = !playing;
  const queue = clips.length > 0 ? clips : mp3.clips;
  const flowTracks = useMemo(
    () => (activeClip ? getUpcomingClips(queue, activeClip.id, 12) : []),
    [activeClip, queue],
  );

  useEffect(() => {
    if (source.kind === "upload") radioMp3Station.pause();
  }, [source.kind]);

  if (source.kind === "upload") {
    return (
      <section className="radio-dj-player card radio-dj-player--plain radio-dj-player--upload" aria-label="Loop MP3 ativo">
        <header className="radio-dj-head">
          <div>
            <p className="kicker">Mamute DJ · loop local</p>
            <h2 className="radio-dj-title">{source.upload.title}</h2>
            <p className="radio-dj-artist">{source.upload.artist}</p>
          </div>
          <span className="radio-dj-platform radio-dj-platform--upload">MP3 · cabine</span>
        </header>
        <p className="radio-dj-caption">
          Faixa local em loop via Web Audio — use o painel abaixo para ajustar região e enviar novos MP3.
        </p>
        {clips[0] ? (
          <button type="button" className="radio-dj-back" onClick={() => onSelectClip(clips[0]!, { autoplay: true })}>
            Voltar à rádio integrada
          </button>
        ) : null}
      </section>
    );
  }

  if (!activeClip) {
    return (
      <section className="radio-dj-player card radio-dj-player--plain radio-dj-player--unified" aria-label="Mamute DJ · rádio integrada">
        <header className="radio-dj-head radio-dj-head--unified">
          <div>
            <p className="kicker">Mamute DJ · rádio integrada</p>
            <h2 className="radio-dj-title">Cabine Mamute FM</h2>
          </div>
        </header>
        <RadioVirtualDisplay
          accent={accent}
          platformLabel="Mamute FM"
          isPlaying={false}
          catalogReady={catalogReady}
          continuous
          playbackLabel="Aguardando playlist — carregue DJ iniciante ou adicione faixas."
          playlistCount={playlistIds.length}
          playlistOnly={playlistOnly}
          onPlaylistOnlyChange={onPlaylistOnlyChange}
          onCatalogUpdated={onCatalogUpdated}
        />
      </section>
    );
  }

  const inPlaylist = playlistIds.includes(activeClip.id);
  const keyColor = activeClip.key ? (getCamelotKey(activeClip.key)?.color ?? accent) : accent;
  const liveStream = (
    <RadioLiveStage
      className="radio-hud-stream-frame"
      accent={accent}
      keyColor={keyColor}
      playing={playing && catalogReady}
    />
  );
  const playbackLabel = !catalogReady
    ? "Sintonizando catálogo eletrônico…"
    : paused
      ? "Standby — o próximo clique na página liga o stream aleatório."
      : "Ao vivo · aleatório · MP3 eletrônico sem parar";

  return (
    <section
      className="radio-dj-player card radio-dj-player--plain radio-dj-player--unified radio-dj-player--nexus"
      aria-label="Mamute DJ · rádio integrada"
      data-continuous={continuous ? "on" : "off"}
      data-random="on"
      data-catalog-ready={catalogReady ? "true" : "false"}
    >
      <header className="radio-dj-head radio-dj-head--unified">
        <div>
          <p className="kicker">Mamute DJ · rádio integrada</p>
          <h2 className="radio-dj-title">{activeClip.title}</h2>
          <p className="radio-dj-artist">{activeClip.artist}</p>
        </div>
        <div className="radio-dj-head-actions">
          <button
            type="button"
            className={inPlaylist ? "radio-dj-playlist-btn is-on" : "radio-dj-playlist-btn"}
            aria-pressed={inPlaylist}
            onClick={() => onTogglePlaylistClip(activeClip.id)}
          >
            {inPlaylist ? "Na playlist" : "+ Playlist"}
          </button>
          <span
            className="radio-dj-platform"
            data-platform={activeClip.platform}
            data-live={playing ? "true" : "false"}
            style={{ "--platform-accent": platformById.get(activeClip.platform)?.accent } as CSSProperties}
          >
            {platformLabel(activeClip.platform)}
          </span>
          <span
            className={playing ? "radio-dj-live-badge" : "radio-dj-live-badge radio-dj-live-badge--idle"}
            role="status"
          >
            {playing ? "AO VIVO" : "STANDBY"}
          </span>
        </div>
      </header>

      <RadioVirtualDisplay
        clip={activeClip}
        accent={accent}
        platformLabel={platformLabel(activeClip.platform)}
        isPlaying={playing}
        catalogReady={catalogReady}
        continuous={continuous}
        playbackLabel={playbackLabel}
        playlistCount={playlistIds.length}
        playlistOnly={playlistOnly}
        onPlaylistOnlyChange={onPlaylistOnlyChange}
        onCatalogUpdated={onCatalogUpdated}
        stream={liveStream}
      />

      {activeClip.sourceUrl ? (
        <a className="radio-dj-source" href={activeClip.sourceUrl} target="_blank" rel="noreferrer">
          Abrir na plataforma
        </a>
      ) : null}

      <div className="radio-dj-deck-premium">
        <div className="radio-dj-on-air" aria-label="Plataforma no ar">
          <span
            className="radio-dj-platform-chip is-active"
            data-platform={activeClip.platform}
            data-live={playing ? "true" : "false"}
            style={{ "--platform-accent": platformById.get(activeClip.platform)?.accent } as CSSProperties}
          >
            <span className="radio-dj-platform-chip-name">{platformLabel(activeClip.platform)}</span>
            <span className="radio-dj-platform-chip-type">
              {playing ? "AO VIVO" : RADIO_PLATFORM_STATION_TYPES[activeClip.platform]}
            </span>
          </span>
        </div>

        <div className="radio-dj-controls">
        <button type="button" className="radio-dj-btn" onClick={() => void mp3.skip(-1)} aria-label="Faixa anterior">
          ◀
        </button>
        <button
          type="button"
          className={`radio-dj-btn radio-dj-btn--play${paused ? "" : " is-on"}`}
          onClick={() => void mp3.toggle()}
          aria-label={paused ? "Ligar rádio" : "Pausar rádio"}
        >
          {paused ? "▶" : "❚❚"}
        </button>
        <button
          type="button"
          className={`radio-dj-btn radio-dj-btn--loop${continuous ? " is-on" : ""}`}
          aria-pressed={continuous}
          onClick={onToggleContinuous}
          aria-label="Alternar rádio contínua"
          title={continuous ? "Rádio contínua ligada" : "Rádio contínua desligada"}
        >
          ⟳
        </button>
        <button type="button" className="radio-dj-btn" onClick={() => void mp3.skip(1)} aria-label="Próxima faixa">
          ▶
        </button>
        </div>
      </div>

      <p className="radio-dj-caption">
        {continuous
          ? "A rádio abre no aleatório e toca qualquer faixa eletrônica em MP3, sem parar. Spotify, SoundCloud, Beatport, Deezer e YouTube Music no acervo."
          : activeClip.caption}
      </p>

      <div className="radio-dj-queue radio-dj-queue--flow" aria-label="Fila contínua">
        <ul className="radio-dj-queue-list">
          {flowTracks.map((clip) => (
            <li key={clip.id}>
              <button
                type="button"
                data-platform={clip.platform}
                className={
                  clip.id === activeClip.id
                    ? "radio-dj-queue-item is-active"
                    : playlistIds.includes(clip.id)
                      ? "radio-dj-queue-item is-saved"
                      : "radio-dj-queue-item"
                }
                aria-pressed={clip.id === activeClip.id}
                onClick={() => {
                  onSelectClip(clip, { autoplay: true });
                  void mp3.playClip(clip.id);
                }}
              >
                <strong>{clip.title}</strong>
                <span>{clip.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
