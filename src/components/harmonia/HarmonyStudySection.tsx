import { useCallback, useState, type KeyboardEvent } from "react";
import { NavLink } from "react-router";
import { HARMONY_DRILLS, HARMONY_STUDIES, HARMONY_TIPS } from "../../data/harmony";
import type { HarmonyStudyId } from "../../types/harmony";

const STUDY_ORDER: HarmonyStudyId[] = ["ler", "aplicar", "metodos", "praticas"];

function studyById(id: HarmonyStudyId) {
  return HARMONY_STUDIES.find((item) => item.id === id) ?? HARMONY_STUDIES[0]!;
}

/** Abas de estudo, dicas e drills — conteúdo exclusivo da página Harmonia. */
export function HarmonyStudySection() {
  const [studyId, setStudyId] = useState<HarmonyStudyId>("ler");
  const study = studyById(studyId);

  const onStudyKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + STUDY_ORDER.length) % STUDY_ORDER.length;
    setStudyId(STUDY_ORDER[nextIndex]!);
  }, []);

  return (
    <>
      <div className="harmony-study">
        <div className="harmony-study-tabs" role="tablist" aria-label="Estudo de harmonia">
          {HARMONY_STUDIES.map((item, index) => {
            const selected = item.id === studyId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`harmony-tab-${item.id}`}
                aria-selected={selected}
                aria-controls="harmony-study-panel"
                tabIndex={selected ? 0 : -1}
                className={selected ? "is-active" : undefined}
                onClick={() => setStudyId(item.id)}
                onKeyDown={(event) => onStudyKeyDown(event, index)}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        <article
          className="card harmony-study-panel"
          id="harmony-study-panel"
          role="tabpanel"
          aria-labelledby={`harmony-tab-${study.id}`}
        >
          <p className="kicker">{study.kicker}</p>
          <h3>{study.title}</h3>
          <p className="harmony-study-lead">{study.lead}</p>

          {study.steps ? (
            <ol className="harmony-steps">
              {study.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
          ) : null}

          {study.cards ? (
            <div className="harmony-method-grid">
              {study.cards.map((card) => (
                <article key={card.title}>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          ) : null}

          {study.bullets ? (
            <ul className="harmony-bullets">
              {study.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </article>
      </div>

      <div className="harmony-tips" aria-label="Dicas de harmonia">
        {HARMONY_TIPS.map((tip) => (
          <article className="card harmony-tip" key={tip.id}>
            <h4>{tip.title}</h4>
            <p>{tip.body}</p>
          </article>
        ))}
      </div>

      <div className="harmony-drills">
        {HARMONY_DRILLS.map((drill) => (
          <article className="card harmony-drill" key={drill.id}>
            <header>
              <h4>{drill.title}</h4>
              <span>{drill.duration}</span>
            </header>
            <p>{drill.goal}</p>
            <ol>
              {drill.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div className="harmony-footer">
        <NavLink className="btn" to="/#harmony-panel">
          Visor Camelot na home
        </NavLink>
        <NavLink className="btn" to="/academia#l-07">
          Aula Camelot na academia
        </NavLink>
        <NavLink className="btn btn-solid" to="/mixer">
          Treinar keys no mixer
        </NavLink>
      </div>
    </>
  );
}
