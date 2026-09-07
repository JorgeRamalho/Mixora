import { useState, type CSSProperties } from "react";
import { PLATFORMS } from "../../data/platforms";
import { RADIO_IMPORT_PLATFORMS } from "../../data/radio";
import { syncCatalogToStorage } from "../../lib/radio-catalog-import";
import type { PlatformId } from "../../types/platform";

type RadioCatalogImportProps = {
  onImported: () => void;
};

const platformById = new Map(PLATFORMS.map((platform) => [platform.id, platform]));

function platformLabel(id: PlatformId): string {
  if (id === "youtube") return "YouTube Music";
  return platformById.get(id)?.name ?? id;
}

export function RadioCatalogImport({ onImported }: RadioCatalogImportProps) {
  const [busy, setBusy] = useState<PlatformId | "all" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runImport = async (platform: PlatformId | "all") => {
    setBusy(platform);
    setMessage(null);
    try {
      const merged =
        platform === "all"
          ? await syncCatalogToStorage()
          : await syncCatalogToStorage(platform);
      const added = merged.length;
      setMessage(
        platform === "all"
          ? `Catálogo atualizado — ${added} faixas na fila Mamute FM (Spotify, Deezer, YouTube Music e Beatport).`
          : `${platformLabel(platform)} importado — ${added} faixas no total.`,
      );
      onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao importar catálogo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="radio-catalog-import card" aria-label="Importar faixas das plataformas">
      <header className="radio-catalog-head">
        <div>
          <p className="kicker">Catálogo · integração</p>
          <h2 className="radio-catalog-title">Importar faixas</h2>
        </div>
        <button
          type="button"
          className="radio-catalog-all-btn"
          disabled={busy !== null}
          onClick={() => void runImport("all")}
        >
          {busy === "all" ? "Importando…" : "Importar tudo"}
        </button>
      </header>

      <p className="radio-catalog-note">
        Metadados via API pública Deezer; clipes no visor via YouTube oficial quando disponível.
        Preview de 30s quando não houver vídeo mapeado.
      </p>

      <div className="radio-catalog-grid">
        {RADIO_IMPORT_PLATFORMS.map((platformId) => {
          const platform = platformById.get(platformId);
          return (
            <button
              key={platformId}
              type="button"
              className="radio-catalog-platform-btn"
              style={{ "--platform-accent": platform?.accent } as CSSProperties}
              disabled={busy !== null}
              onClick={() => void runImport(platformId)}
            >
              {busy === platformId ? "…" : "Importar"}
              <span>{platformLabel(platformId)}</span>
            </button>
          );
        })}
      </div>

      {message ? <p className="radio-catalog-status">{message}</p> : null}
    </section>
  );
}
