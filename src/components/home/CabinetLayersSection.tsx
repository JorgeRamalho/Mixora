import { useCallback, useState, type CSSProperties, type KeyboardEvent } from "react";
import { NavLink } from "react-router";
import { CABINET_LAYERS, type CabinetLayer, type CabinetLayerId } from "../../data/cabinet-layers";

function layerById(id: CabinetLayerId): CabinetLayer {
  return CABINET_LAYERS.find((layer) => layer.id === id) ?? CABINET_LAYERS[0]!;
}

export function CabinetLayersSection() {
  const [activeId, setActiveId] = useState<CabinetLayerId>("mixer");
  const active = layerById(activeId);

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + delta + CABINET_LAYERS.length) % CABINET_LAYERS.length;
      setActiveId(CABINET_LAYERS[next]!.id);
    },
    [],
  );

  return (
    <section
      className="home-showcase cabinet-showcase"
      id="camadas"
      aria-labelledby="cabinet-layers-title"
    >
      <div className="home-showcase-head">
        <p className="kicker">Arquitetura · booth MIXORA</p>
        <h2 id="cabinet-layers-title">Duas camadas da cabine MIXORA</h2>
        <p>
          Interface de player moderno, motor pedagógico de CDJ e um catálogo que respeita cada
          plataforma em vez de fingir um LINK que ainda não existe.
        </p>
      </div>

      <div className="cabinet-stage">
        <div
          className="cabinet-nav"
          role="tablist"
          aria-label="Camadas da cabine"
          style={{ "--layer-accent": active.accent } as CSSProperties}
        >
          {CABINET_LAYERS.map((layer, index) => {
            const selected = layer.id === activeId;
            return (
              <button
                key={layer.id}
                type="button"
                role="tab"
                id={`cabinet-tab-${layer.id}`}
                aria-selected={selected}
                aria-controls="cabinet-spotlight"
                tabIndex={selected ? 0 : -1}
                className={selected ? "cabinet-tab is-active" : "cabinet-tab"}
                style={{ "--tab-accent": layer.accent } as CSSProperties}
                onClick={() => setActiveId(layer.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                <span className="cabinet-tab-index">{layer.index}</span>
                <span className="cabinet-tab-copy">
                  <strong>{layer.tagline}</strong>
                  <span>{layer.title}</span>
                </span>
                <span className="cabinet-tab-glyph" aria-hidden="true">
                  {layer.glyph}
                </span>
              </button>
            );
          })}
          <span className="cabinet-spine" aria-hidden="true" />
        </div>

        <article
          className="card cabinet-spotlight"
          id="cabinet-spotlight"
          role="tabpanel"
          aria-labelledby={`cabinet-tab-${activeId}`}
          data-stage="11"
          style={{ "--spot-accent": active.accent } as CSSProperties}
        >
          <div className="cabinet-spotlight-glow" aria-hidden="true" />
          <div className="cabinet-spotlight-top">
            <span className="cabinet-spotlight-index">{active.index}</span>
            <span className="cabinet-spotlight-glyph" aria-hidden="true">
              {active.glyph}
            </span>
          </div>
          <h3>{active.title}</h3>
          <p>{active.body}</p>
          <div className="cabinet-wave" aria-hidden="true">
            {Array.from({ length: 16 }, (_, bar) => (
              <span key={bar} style={{ "--bar-i": String(bar) } as CSSProperties} />
            ))}
          </div>
          <NavLink className="btn btn-solid" to={active.route}>
            {active.cta}
          </NavLink>
        </article>
      </div>
    </section>
  );
}
