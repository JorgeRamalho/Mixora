import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { BRAND } from "../../data/brand";
import {
  DOWNLOAD_PACKS,
  DOWNLOAD_VERSION,
  DOWNLOAD_WIZARD,
  isDownloadPackId,
  packById,
} from "../../data/downloads";
import { detectClient } from "../../lib/detect-os";
import { downloadPlatformPack, formatBytes } from "../../lib/download-pack";
import type { DownloadPack, DownloadPackId, DownloadWizardStep } from "../../types";
import { DownloadDocs } from "./DownloadDocs";
import { DownloadIcon } from "./DownloadIcon";
import { downloadBlockClass, downloadBlockVars } from "./download-motion";
import { OsMark } from "./OsMark";

export function DownloadHub() {
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<DownloadPackId | null>(null);
  const [recommendedId, setRecommendedId] = useState<DownloadPackId | null>(null);
  const [detectedLabel, setDetectedLabel] = useState("lendo o dispositivo…");
  const [step, setStep] = useState<DownloadWizardStep>(1);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const client = detectClient();
    setDetectedLabel(client.label);
    setRecommendedId(client.packId);
    const hash = location.hash.replace(/^#/, "");
    const fromHash = isDownloadPackId(hash) ? hash : null;
    const nextId = fromHash ?? client.packId;
    setSelectedId(nextId);
    setStep(nextId ? 2 : 1);
  }, [location.hash]);

  const selected = selectedId ? packById(selectedId) : undefined;
  const recommended = recommendedId ? packById(recommendedId) : undefined;

  function choosePack(id: DownloadPackId) {
    setSelectedId(id);
    setError(null);
    setStep(2);
  }

  function runDownload(pack: DownloadPack) {
    setBusy(true);
    setError(null);
    setSelectedId(pack.id);
    setStep(3);
    try {
      const result = downloadPlatformPack(pack.id);
      setSaved(`${result.fileName} · ${formatBytes(result.bytes)}`);
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao montar o pacote");
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="download-hub">
      {recommended ? (
        <section
          className={downloadBlockClass(0, "download-recommended")}
          style={downloadBlockVars(0)}
          aria-label="Arquivo recomendado"
        >
          <div className="download-recommended-copy">
            <p className="kicker">Detectamos {detectedLabel}</p>
            <h2>Baixe o pacote deste sistema</h2>
            <p>
              {recommended.fileName} — {recommended.fileKind}. O botão monta o ZIP na hora e
              o navegador salva na pasta Downloads.
            </p>
          </div>
          <button
            className="btn btn-solid download-run"
            type="button"
            disabled={busy}
            onClick={() => runDownload(recommended)}
          >
            <DownloadIcon className="download-run-icon" />
            {busy && selectedId === recommended.id ? "Montando…" : "Download"}
          </button>
        </section>
      ) : (
        <section
          className={downloadBlockClass(1, "download-recommended is-unknown")}
          style={downloadBlockVars(1)}
          aria-label="Sistema não identificado"
        >
          <p className="kicker">Sistema não identificado</p>
          <h2>Escolha a plataforma abaixo</h2>
          <p>O MIXORA não leu o SO deste dispositivo. Selecione Windows, macOS, Linux, Android ou iOS.</p>
        </section>
      )}

      <ol className="download-wizard" aria-label="Passo a passo do download">
        {DOWNLOAD_WIZARD.map((item) => {
          const state = item.step < step ? "done" : item.step === step ? "current" : "todo";
          return (
            <li
              key={item.step}
              className={downloadBlockClass(
                item.step - 1,
                `download-wizard-step is-${state}`,
              )}
              style={downloadBlockVars(item.step - 1)}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="download-wizard-index">{item.step}</span>
              <span className="download-wizard-copy">
                <strong>{item.title}</strong>
                <span>{item.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <section aria-label="Arquivos por sistema operacional">
        <header className="download-grid-head">
          <p className="kicker">Todas as plataformas</p>
          <h2>Um arquivo para cada sistema</h2>
        </header>
        <div className="download-grid">
          {DOWNLOAD_PACKS.map((pack, index) => {
            const active = pack.id === selectedId;
            const suggested = pack.id === recommendedId;
            return (
              <article
                key={pack.id}
                id={pack.id}
                className={downloadBlockClass(
                  index,
                  active ? "card download-card is-active" : "card download-card",
                )}
                style={downloadBlockVars(index)}
              >
                <header>
                  <span className="download-card-mark" style={{ color: pack.accent }}>
                    <OsMark family={pack.family} />
                  </span>
                  <div>
                    <h3>{pack.name}</h3>
                    <p className="kicker">{pack.short}</p>
                  </div>
                  {suggested ? <span className="download-badge">Recomendado</span> : null}
                </header>
                <p>{pack.summary}</p>
                <p className="download-file">
                  <strong>{pack.fileName}</strong>
                  <span>{pack.fileKind}</span>
                </p>
                <p className="download-req">{pack.requirements}</p>
                <div className="download-card-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => choosePack(pack.id)}
                  >
                    Ver passos
                  </button>
                  <button
                    className="btn btn-solid"
                    type="button"
                    disabled={busy}
                    onClick={() => runDownload(pack)}
                  >
                    <DownloadIcon className="download-run-icon" />
                    Download
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selected ? (
        <section
          className={downloadBlockClass(1, "download-install")}
          style={downloadBlockVars(1)}
          aria-label={`Instalação ${selected.name}`}
        >
          <header>
            <p className="kicker">
              Passo {step} de {DOWNLOAD_WIZARD.length} · {selected.name}
            </p>
            <h2>Como instalar {selected.short}</h2>
            <p>
              Versão {DOWNLOAD_VERSION} · {BRAND.os}. Depois do Download, extraia o ZIP e siga a
              ordem abaixo.
            </p>
          </header>
          {saved ? (
            <p className="download-saved" role="status">
              Arquivo salvo: {saved}
            </p>
          ) : null}
          {error ? (
            <p className="download-error" role="alert">
              {error}
            </p>
          ) : null}
          <ol className="download-install-steps">
            {selected.installSteps.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <Link className="btn btn-solid" to="/" onClick={() => setStep(5)}>
            Abrir a cabine
          </Link>
        </section>
      ) : null}

      <DownloadDocs />
    </div>
  );
}
