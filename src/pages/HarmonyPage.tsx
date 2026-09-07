import { useState } from "react";
import { HarmonyStudySection } from "../components/harmonia/HarmonyStudySection";
import { HarmonyVisor } from "../components/home/HarmonyVisor";

const DEFAULT_CODE = "8A";

export function HarmonyPage() {
  const [code, setCode] = useState(DEFAULT_CODE);

  return (
    <div className="page harmony-page">
      <header className="harmony-page-intro">
        <p className="kicker">MIXORA · harmonia Camelot</p>
        <h1>Navegue em boa sintonia</h1>
        <p className="lede">
          A escala Camelot traduz o círculo de quintas em relógio: B no anel de fora (maior), A no
          de dentro (menor). Clique uma fatia — os vizinhos acendem. Abaixo estão o visor, os
          guias para ler a roda, aplicar no set, métodos de navegação, boas práticas e drills de
          cabine.
        </p>
      </header>

      <section
        className="home-showcase harmony-showcase harmony-panel harmony-page-visor"
        id="harmonia-visor"
        aria-label="Visor da escala Camelot"
      >
        <HarmonyVisor selected={code} onSelect={setCode} />
      </section>

      <section className="home-showcase harmony-showcase harmony-info" aria-label="Estudo de harmonia">
        <HarmonyStudySection />
      </section>
    </div>
  );
}
