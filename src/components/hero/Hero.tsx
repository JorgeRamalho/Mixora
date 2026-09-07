import { DigitalVisor } from "./DigitalVisor";
import { MixoraMascot } from "./MixoraMascot";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <MixoraMascot />
        <p className="kicker">MIXORA OS · a cabine harmônica</p>
        <h1>
          MIXORAPlayerDJ
          <span> dois decks. uma harmonia.</span>
        </h1>
        <p className="lede">
          O player que cruza mix, harmonia e tecnologia: CDJ e controladora virtuais,
          academia do primeiro beat à conclusão e um catálogo honesto —
          MIXORA, Beatport, SoundCloud, Deezer, Spotify e YouTube.
        </p>
      </div>
      <div className="hero-visor" id="visor">
        <DigitalVisor placement="hero" />
      </div>
    </section>
  );
}
