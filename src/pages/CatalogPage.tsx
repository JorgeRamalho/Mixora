import { CatalogHub } from "../components/catalog/CatalogHub";

export function CatalogPage() {
  return (
    <div className="page platforms-page">
      <header className="platforms-intro">
        <p className="kicker">Integrações de plataformas</p>
        <h1>Plataformas</h1>
        <p className="lede">
          MIXORA, Beatport, SoundCloud, Deezer, YouTube e Spotify — o que cada serviço permite no
          MIXORAPlayerDJ e o que ainda bloqueia uma cabine de verdade.
        </p>
      </header>
      <CatalogHub />
    </div>
  );
}
