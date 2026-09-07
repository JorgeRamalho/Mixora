import { MixerBoard } from "../components/mixer/MixerBoard";

export function MixerPage() {
  return (
    <div className="page mixer-page">
      <header className="mixer-page-head">
        <p className="kicker">Modo equipamento · DDJ-400</p>
        <h1>Mixer CDJ</h1>
        <p className="lede">Arraste a faixa da playlist para o Deck A ou B.</p>
      </header>
      <MixerBoard />
    </div>
  );
}
