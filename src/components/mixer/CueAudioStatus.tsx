import type { CueAudioRoutingStatus } from "../../lib/cue-audio-routing";

const STATUS_LABEL: Record<CueAudioRoutingStatus, string> = {
  unsupported: "Fone: mesmo destino do master",
  default: "Fone: destino padrão do PC",
  searching: "Fone: procurando DDJ-400",
  routed: "Fone: DDJ-400",
  unavailable: "Fone: escolha a saída",
  error: "Fone: roteamento falhou",
};

/**
 * Chip de roteamento do bus de cue para o jack PHONES da DDJ-400.
 *
 * @param status Estado atual do `useCueAudioRouting`.
 * @param deviceLabel Nome do endpoint USB quando o roteamento funcionou.
 * @param detail Texto de diagnóstico ou aviso sobre o knob PHONES físico.
 * @param canChooseOutput True quando o seletor nativo do Chrome pode ser aberto.
 * @param onRetry Reenumera dispositivos e tenta `setCueSinkId` de novo.
 * @param onChooseOutput Abre `selectAudioOutput()` do Chrome.
 */
export function CueAudioStatus({
  status,
  deviceLabel,
  detail,
  canChooseOutput,
  onRetry,
  onChooseOutput,
}: {
  status: CueAudioRoutingStatus;
  deviceLabel: string | null;
  detail: string | null;
  canChooseOutput: boolean;
  onRetry: () => void;
  onChooseOutput: () => void;
}) {
  const label =
    status === "routed" && deviceLabel
      ? `Fone → ${deviceLabel}`
      : STATUS_LABEL[status];

  return (
    <div
      className="mixer-cue-audio-status"
      data-state={status}
      role="status"
      aria-label={`Saída de cue: ${label}`}
    >
      <span className="mixer-midi-dot" aria-hidden="true" />
      <span className="mixer-midi-copy">
        <span className="mixer-midi-label">{label}</span>
        {detail ? <span className="mixer-midi-detail">{detail}</span> : null}
      </span>
      {canChooseOutput ? (
        <button
          type="button"
          className="mixer-midi-connect"
          aria-label="Escolher saída de fone da DDJ-400"
          onClick={onChooseOutput}
        >
          {status === "routed" ? "Trocar saída" : "Escolher saída"}
        </button>
      ) : null}
      {status === "error" || status === "unavailable" ? (
        <button
          type="button"
          className="mixer-midi-connect"
          aria-label="Tentar rotear o cue para a DDJ-400 de novo"
          onClick={onRetry}
        >
          Tentar
        </button>
      ) : null}
    </div>
  );
}
