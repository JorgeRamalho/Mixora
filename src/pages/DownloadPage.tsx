import { DownloadHub } from "../components/download/DownloadHub";

export function DownloadPage() {
  return (
    <div className="page download-page">
      <header className="download-intro">
        <p className="kicker">Lançador · todas as plataformas</p>
        <h1>Download MIXORAPlayerDJ</h1>
        <p className="lede">
          O botão Download do header abre esta tela. O MIXORA detecta o sistema, monta o ZIP
          da plataforma — Windows, macOS, Linux, Android ou iOS — e o navegador salva o
          arquivo. Abaixo estão o passo a passo do lançador e a documentação de todos os
          modos profissionais da cabine.
        </p>
      </header>
      <DownloadHub />
    </div>
  );
}
