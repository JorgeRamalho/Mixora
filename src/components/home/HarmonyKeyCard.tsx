import { useMemo, type CSSProperties } from "react";
import {
  CAMELOT_BY_CODE,
  getCamelotKey,
  harmonicSquare,
  neighborCamelot,
  relativeCamelot,
} from "../../lib/musical-key";

const DEFAULT_CODE = "8A";

interface HarmonyKeyCardProps {
  selected: string;
  onSelect: (code: string) => void;
}

export function HarmonyKeyCard({ selected, onSelect }: HarmonyKeyCardProps) {
  const active = getCamelotKey(selected) ?? CAMELOT_BY_CODE[DEFAULT_CODE]!;
  const relative = relativeCamelot(active.code);
  const prev = neighborCamelot(active.code, -1);
  const next = neighborCamelot(active.code, 1);
  const journey = useMemo(() => harmonicSquare(active.code), [active.code]);

  const relativeKey = relative ? getCamelotKey(relative) : undefined;
  const prevKey = prev ? getCamelotKey(prev) : undefined;
  const nextKey = next ? getCamelotKey(next) : undefined;

  const neighborChips = [
    { key: prevKey, hint: "−1 quinta" },
    { key: relativeKey, hint: "relativo" },
    { key: nextKey, hint: "+1 quinta" },
  ].filter((item): item is { key: NonNullable<typeof prevKey>; hint: string } => Boolean(item.key));

  return (
    <article
      className="card harmony-key-card"
      aria-live="polite"
      data-stage="13"
      style={{ "--spot-accent": active.color } as CSSProperties}
    >
      <p className="kicker">Tom selecionado · vetor 3D</p>
      <header className="harmony-key-head">
        <span className="harmony-key-code">{active.code}</span>
        <div>
          <h3>{active.namePt}</h3>
          <p>
            {active.nameIntl} · {active.mode}
          </p>
        </div>
      </header>

      <p className="harmony-key-lead">
        {active.letter === "A"
          ? "Tom menor: corpo, groove, afterglow. O relativo maior abre o céu no peak."
          : "Tom maior: céu aberto, vocal e peak. O relativo menor fecha o corpo sem sair do bairro."}
      </p>

      <div className="harmony-neighbors" aria-label="Tons compatíveis">
        {neighborChips.map((item) => (
          <button
            key={item.key.code}
            type="button"
            className="harmony-chip"
            style={{ "--chip-accent": item.key.color } as CSSProperties}
            onClick={() => onSelect(item.key.code)}
          >
            <strong>{item.key.code}</strong>
            <span>{item.key.namePt}</span>
            <em>{item.hint}</em>
          </button>
        ))}
      </div>

      <div className="harmony-journey">
        <p className="kicker">Jornada sugerida · quadrado harmônico</p>
        <div className="harmony-prism-scene" aria-hidden="true">
          <div className="harmony-prism-rig">
            <span className="harmony-prism-plane" />
            {journey.map((step) => {
              const stepKey = getCamelotKey(step);
              return (
                <span
                  key={step}
                  className={
                    step === active.code ? "harmony-prism-node is-active" : "harmony-prism-node"
                  }
                  style={
                    {
                      "--node-color": stepKey?.color ?? active.color,
                    } as CSSProperties
                  }
                >
                  {step}
                </span>
              );
            })}
          </div>
        </div>
        <ol>
          {journey.map((step, index) => {
            const stepKey = getCamelotKey(step);
            return (
              <li key={step}>
                <button
                  type="button"
                  className={step === active.code ? "is-active" : undefined}
                  style={{ "--chip-accent": stepKey?.color ?? active.color } as CSSProperties}
                  onClick={() => onSelect(step)}
                >
                  <span>{index + 1}</span>
                  {step}
                </button>
              </li>
            );
          })}
        </ol>
        <p>{journey.join(" → ")} — um bloco de quatro faixas que volta para casa.</p>
      </div>
    </article>
  );
}
