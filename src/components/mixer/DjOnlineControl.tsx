import { planDjOnline } from "../../lib/dj-online";
import { getCamelotKey } from "../../lib/musical-key";
import type { MixerAction, MixerSnapshot } from "../../types/mixer";

export function DjOnlineControl({
  snap,
  onChange,
}: {
  snap: MixerSnapshot;
  onChange: (action: MixerAction) => void;
}) {
  const plan = planDjOnline(snap);
  const keyA = getCamelotKey(plan.keyA);
  const keyB = getCamelotKey(plan.keyB);
  const active = snap.djOnline;

  return (
    <div
      className="mixer-dj-online"
      data-on={active ? "true" : "false"}
      data-harmony={plan.harmony}
      data-master={plan.masterDeck}
      data-sync={plan.syncDeck}
      role="group"
      aria-label="DJ ONLINE — harmonia Camelot e MASTER/SYNC"
    >
      <button
        type="button"
        className={`mixer-dj-online-btn${active ? " is-on" : ""}`}
        aria-pressed={active}
        aria-label="DJ ONLINE"
        title="IA Camelot: harmonia, sintoniza BPM e liga MASTER/SYNC na passagem"
        onClick={() => onChange({ type: "toggleDjOnline" })}
      >
        <span className="mixer-dj-online-led" aria-hidden="true" />
        <span className="mixer-dj-online-copy">
          <span className="mixer-dj-online-kicker">{active ? "AO VIVO" : "IA CAMELOT"}</span>
          <span className="mixer-dj-online-title">DJ ONLINE</span>
        </span>
      </button>

      <p className="mixer-dj-online-status">
        <span className="mixer-dj-online-keys">
          <span style={keyA ? { color: keyA.color } : undefined}>{plan.keyA}</span>
          <span aria-hidden="true">→</span>
          <span style={keyB ? { color: keyB.color } : undefined}>{plan.keyB}</span>
        </span>
        <span className="mixer-dj-online-rel">{plan.label}</span>
      </p>

      {active ? (
        <p className="mixer-dj-online-mode">
          MASTER {plan.masterDeck.toUpperCase()} · SYNC {plan.syncDeck.toUpperCase()}
          {plan.melodyPath.length > 0 ? ` · ${plan.melodyPath.join(" ")}` : ""}
        </p>
      ) : (
        <p className="mixer-dj-online-mode">Harmonia · sintoniza · MASTER/SYNC na passagem</p>
      )}
    </div>
  );
}
