import type { BrowseSource } from "../../types/mixer";

export type BrowseChipTrack = {
  title: string;
  artist?: string;
  bpm: number | string | null;
  key: string | null;
};

/**
 * Chip da biblioteca, mostrando a track sob o cursor do encoder BROWSE.
 *
 * Existe porque girar o encoder **não** toca no áudio nem no snapshot, e sem um
 * espelho na tela o gesto seria invisível: o DJ giraria o knob e só descobriria
 * onde parou ao apertar o LOAD, quando a track já estaria na deck.
 *
 * @param track Track destacada, já resolvida pelo `MixerBoard`. Null no skeleton.
 * @param position Índice do cursor começando em 1, para leitura humana.
 * @param total Tamanho da biblioteca.
 * @param source Fonte ativa, para o badge USB vs API.
 * @param loading Primeira carga remota, ainda sem placeholder.
 */
export function BrowseChip({
  track,
  position,
  total,
  source,
  loading = false,
  activeDeck = "a",
}: {
  track: BrowseChipTrack | null;
  position: number;
  total: number;
  source: BrowseSource;
  loading?: boolean;
  /** Deck cuja playlist o encoder BROWSE navega no momento. */
  activeDeck?: "a" | "b";
}) {
  const sourceLabel = source === "remote" ? "API" : "USB";
  const bpm = track?.bpm ?? "—";
  const key = track?.key ?? "—";
  const title = loading ? "Carregando biblioteca…" : (track?.title ?? "Biblioteca vazia");
  const label = loading
    ? "Browse carregando a biblioteca remota"
    : `Browse deck ${activeDeck.toUpperCase()} ${position} de ${total}: ${title}, ${bpm} BPM, tom ${key}. LOAD envia para a deck`;

  return (
    <div
      className="mixer-browse-chip"
      role="status"
      data-source={source}
      data-deck={activeDeck}
      data-loading={loading ? "true" : "false"}
      aria-label={label}
    >
      <span className="mixer-browse-tag" aria-hidden="true">
        {sourceLabel}
      </span>
      <span className="mixer-browse-copy">
        <span className="mixer-browse-title">{title}</span>
        <span className="mixer-browse-meta">
          {loading
            ? "Aguarde a listagem…"
            : `${bpm} BPM · ${key} · ${Math.min(position, Math.max(total, 1))}/${total}`}
        </span>
      </span>
    </div>
  );
}
