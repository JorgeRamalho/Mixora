import { DigitalVisor } from "../hero/DigitalVisor";

/** Painel HUD em faixa — mesma largura do layout, abaixo do hero. */
export function VisorSection() {
  return (
    <section className="visor-section" id="visor" aria-label="Visor digital MIXORA OS">
      <DigitalVisor />
    </section>
  );
}
