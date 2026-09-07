import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router";
import { BOOTH_FAQ_TOPIC_LABEL, PLAN_FAQS } from "../../data/plans";
import type { BoothFaqTopic, PlanFaq } from "../../types/plan";

type FaqFilter = BoothFaqTopic | "all";

const FAQ_FILTERS: { id: FaqFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "assinatura", label: BOOTH_FAQ_TOPIC_LABEL.assinatura },
  { id: "mixer", label: BOOTH_FAQ_TOPIC_LABEL.mixer },
  { id: "academia", label: BOOTH_FAQ_TOPIC_LABEL.academia },
  { id: "integracoes", label: BOOTH_FAQ_TOPIC_LABEL.integracoes },
  { id: "conta", label: BOOTH_FAQ_TOPIC_LABEL.conta },
];

const COMPASS_LAYERS = ["Mixer", "Academia", "Visor"] as const;

function faqById(id: string): PlanFaq | undefined {
  return PLAN_FAQS.find((item) => item.id === id);
}

export function BoothFaqSection() {
  const [filter, setFilter] = useState<FaqFilter>("all");
  const [openId, setOpenId] = useState(PLAN_FAQS[0]?.id ?? "");

  const filtered = useMemo(
    () => (filter === "all" ? PLAN_FAQS : PLAN_FAQS.filter((item) => item.topic === filter)),
    [filter],
  );

  const active = faqById(openId) ?? filtered[0];

  useEffect(() => {
    if (!filtered.some((item) => item.id === openId)) {
      setOpenId(filtered[0]?.id ?? "");
    }
  }, [filtered, openId]);

  return (
    <section className="booth-faq" aria-labelledby="plans-faq-title">
      <header className="booth-faq-head">
        <p className="kicker">Orientação · booth MIXORA</p>
        <h3 id="plans-faq-title">Perguntas da booth</h3>
        <p className="booth-faq-lead">
          FAQ da cabine: respostas diretas sobre combo, treino, academia e integrações — com rumo
          prático para decidir o próximo passo no MIXORAPlayerDJ.
        </p>
      </header>

      <div className="booth-faq-compass" aria-hidden="true">
        {COMPASS_LAYERS.map((layer) => (
          <span key={layer}>{layer}</span>
        ))}
      </div>

      <div className="booth-faq-filters" role="tablist" aria-label="Filtrar perguntas da booth">
        {FAQ_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={filter === item.id ? "is-active" : undefined}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="booth-faq-layout">
        <nav className="booth-faq-rail" aria-label="Lista de perguntas">
          {filtered.map((item, index) => {
            const selected = item.id === active?.id;
            return (
              <button
                key={item.id}
                type="button"
                className={selected ? "booth-faq-rail-item is-active" : "booth-faq-rail-item"}
                aria-current={selected ? "true" : undefined}
                data-topic={item.topic}
                onClick={() => setOpenId(item.id)}
              >
                <span className="booth-faq-rail-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="booth-faq-rail-copy">
                  <span className="booth-faq-rail-topic">{BOOTH_FAQ_TOPIC_LABEL[item.topic]}</span>
                  <span className="booth-faq-rail-question">{item.question}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {active ? (
          <article className="booth-faq-panel card" data-topic={active.topic}>
            <div className="booth-faq-panel-glow" aria-hidden="true" />
            <header className="booth-faq-panel-head">
              <p className="booth-faq-topic">{BOOTH_FAQ_TOPIC_LABEL[active.topic]}</p>
              <h4>{active.question}</h4>
            </header>
            <p className="booth-faq-answer">{active.answer}</p>

            <div className="booth-faq-rumo">
              <p className="kicker">Rumo prático</p>
              <ul>
                {active.takeaways.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {active.route && active.routeLabel ? (
              <NavLink className="btn booth-faq-cta" to={active.route}>
                {active.routeLabel}
              </NavLink>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
