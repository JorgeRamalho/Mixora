import { useState } from "react";
import { NavLink } from "react-router";
import { HarmonyVisor } from "./HarmonyVisor";

const DEFAULT_CODE = "8A";

/** Visor Camelot na home — roda + painel de tom, sem estudo. */
export function HarmonyPanel() {
  const [code, setCode] = useState(DEFAULT_CODE);

  return (
    <section
      className="home-showcase harmony-showcase harmony-panel"
      id="harmony-panel"
      aria-labelledby="harmony-panel-title"
    >
      <NavLink
        to="/harmonia"
        className="home-showcase-head harmony-panel-head-link"
        aria-label="Ir para a página Harmonia — estudos e guias da roda Camelot"
        title="Abrir página Harmonia"
      >
        <p className="kicker">MIXORA · harmonia Camelot</p>
        <h2 id="harmony-panel-title">Navegue em boa sintonia</h2>
        <p>
          A escala Camelot traduz o círculo de quintas em relógio: B no anel de fora (maior), A no
          de dentro (menor). Clique uma fatia — os vizinhos acendem. É o mapa para o aluno sentir
          que pode viajar de tom em tom sem desafinar a pista.
        </p>
      </NavLink>

      <HarmonyVisor selected={code} onSelect={setCode} />
    </section>
  );
}
