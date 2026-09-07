import { useState } from "react";

type MascotMood = "ready" | "locked" | "live";

const MOODS: Record<MascotMood, { label: string; message: string }> = {
  ready: { label: "PRONTO", message: "Bora encontrar a próxima batida." },
  locked: { label: "NO FLUXO", message: "A harmonia está travada em 8A → 9A." },
  live: { label: "AO VIVO", message: "Sinal aberto. Solta o grave." },
};

const NEXT_MOOD: Record<MascotMood, MascotMood> = {
  ready: "locked",
  locked: "live",
  live: "ready",
};

export function MixoraMascot() {
  const [mood, setMood] = useState<MascotMood>("ready");
  const currentMood = MOODS[mood];

  return (
    <div className={`mascot-wrap mascot-wrap--${mood}`}>
      <button
        className="mixora-mascot"
        type="button"
        aria-label={`Mascote MIXORA: ${currentMood.label}. Ativar próximo estado`}
        aria-pressed={mood !== "ready"}
        onClick={() => setMood(NEXT_MOOD[mood])}
      >
        <span className="mascot-aura" aria-hidden="true" />
        <span className="mascot-arm mascot-arm--left" aria-hidden="true" />
        <span className="mascot-arm mascot-arm--right" aria-hidden="true" />
        <span className="mascot-body" aria-hidden="true">
          <span className="mascot-jacket-mark">M</span>
        </span>
        <span className="mascot-head" aria-hidden="true">
          <span className="mascot-hood" />
          <span className="mascot-face">
            <span className="mascot-eye mascot-eye--left" />
            <span className="mascot-eye mascot-eye--right" />
            <span className="mascot-mouth" />
          </span>
          <span className="mascot-headphone mascot-headphone--left" />
          <span className="mascot-headphone mascot-headphone--right" />
        </span>
        <span className="mascot-wave mascot-wave--one" aria-hidden="true" />
        <span className="mascot-wave mascot-wave--two" aria-hidden="true" />
      </button>
      <span className="mascot-status" aria-live="polite">
        <span className="mascot-status-dot" aria-hidden="true" />
        {currentMood.label}
      </span>
      <span className="mascot-message">{currentMood.message}</span>
    </div>
  );
}
