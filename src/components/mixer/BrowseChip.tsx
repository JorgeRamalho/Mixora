import type { TrainingTrack } from "../../types/mixer";

/**
 * Chip da biblioteca, mostrando a track sob o cursor do encoder BROWSE.
 *
 * Existe porque girar o encoder **não** toca no áudio nem no snapshot, e sem um
 * espelho na tela o gesto seria invisível: o DJ giraria o knob e só descobriria
 * onde parou ao apertar o LOAD, quando a track já estaria na deck.
 *
 * O `aria-label` diz também a posição na lista, e não só o título, porque um
 * cursor que dá a volta precisa informar que voltou ao começo.
 *
 * @param track Track destacada, já resolvida pelo `MixerBoard`.
 * @param position Índice do cursor começando em 1, para leitura humana.
 * @param total Tamanho da biblioteca.
 */
export function BrowseChip({
  track,
  position,
  total,
}: {
  track: TrainingTrack;
  position: number;
  total: number;
}) {
  return (
    <div
      className="mixer-browse-chip"
      role="status"
      aria-label={`Browse ${position} de ${total}: ${track.title}, ${track.bpm} BPM, tom ${track.key}. LOAD envia para a deck`}
    >
      <span className="mixer-browse-tag" aria-hidden="true">
        Browse
      </span>
      <span className="mixer-browse-copy">
        <span className="mixer-browse-title">{track.title}</span>
        <span className="mixer-browse-meta">
          {track.bpm} BPM · {track.key} · {position}/{total}
        </span>
      </span>
    </div>
  );
}
