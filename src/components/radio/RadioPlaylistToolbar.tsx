import { useState } from "react";
import { BEGINNER_DJ_HINT } from "../../data/beginner-dj-tracks";
import { syncBeginnerDjToStorage } from "../../lib/radio-catalog-import";
import { markBeginnerPlaylistLoaded } from "../../lib/radio-user-playlist";

type RadioPlaylistToolbarProps = {
  playlistCount: number;
  playlistOnly: boolean;
  onPlaylistOnlyChange: (value: boolean) => void;
  onCatalogUpdated: () => void;
};

export function RadioPlaylistToolbar({
  playlistCount,
  playlistOnly,
  onPlaylistOnlyChange,
  onCatalogUpdated,
}: RadioPlaylistToolbarProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadBeginnerPlaylist = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const merged = await syncBeginnerDjToStorage();
      markBeginnerPlaylistLoaded();
      setMessage(`Playlist DJ iniciante carregada — ${merged.length} faixas nas plataformas.`);
      onCatalogUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a playlist.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="radio-cabinet-toolbar">
      <p className="radio-cabinet-hint">{BEGINNER_DJ_HINT}</p>
      <div className="radio-cabinet-actions">
        <button
          type="button"
          className="radio-cabinet-btn radio-cabinet-btn--primary"
          disabled={busy}
          onClick={() => void loadBeginnerPlaylist()}
        >
          {busy ? "Carregando…" : "Carregar playlist DJ iniciante"}
        </button>
        <label className="radio-cabinet-toggle">
          <input
            type="checkbox"
            checked={playlistOnly}
            onChange={(event) => onPlaylistOnlyChange(event.target.checked)}
            disabled={playlistCount === 0}
          />
          <span>Minha playlist ({playlistCount})</span>
        </label>
      </div>
      {message ? <p className="radio-cabinet-status">{message}</p> : null}
    </div>
  );
}
