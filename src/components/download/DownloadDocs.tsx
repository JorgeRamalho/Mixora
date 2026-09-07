import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { DOWNLOAD_DOCS, docById, docIdFromHash } from "../../data/download-docs";
import { downloadDocFile, downloadDocsManual, formatBytes } from "../../lib/download-pack";
import type { DownloadDoc, DownloadDocId } from "../../types";
import { DownloadIcon } from "./DownloadIcon";
import { downloadBlockClass, downloadBlockVars } from "./download-motion";

export function DownloadDocs() {
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<DownloadDocId>(DOWNLOAD_DOCS[0]?.id ?? "mixer");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    const fromHash = docIdFromHash(hash);
    if (!fromHash) return;
    setSelectedId(fromHash);
    const targetId = hash === "docs" ? "docs" : `docs-${fromHash}`;
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const selected = docById(selectedId);

  function runDoc(doc: DownloadDoc) {
    setBusy(true);
    setError(null);
    setSelectedId(doc.id);
    try {
      const result = downloadDocFile(doc.id);
      setSaved(`${result.fileName} · ${formatBytes(result.bytes)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao baixar a documentação");
    } finally {
      setBusy(false);
    }
  }

  function runManual() {
    setBusy(true);
    setError(null);
    try {
      const result = downloadDocsManual();
      setSaved(`${result.fileName} · ${formatBytes(result.bytes)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao montar o manual");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="download-docs" id="docs" aria-label="Documentação dos modos profissionais">
      <header
        className={downloadBlockClass(0, "download-docs-head")}
        style={downloadBlockVars(0)}
      >
        <div className="download-docs-copy">
          <p className="kicker">Manual da cabine</p>
          <h2>Documentação em todos os modos profissionais</h2>
          <p>
            Mixer CDJ, DJ ONLINE, Harmonia, Academia, Plataformas, Área DJ, Visor e
            controladora MIDI. Leia aqui ou baixe o .txt de cada modo — o ZIP de cada sistema já
            leva a pasta docs/.
          </p>
        </div>
        <button className="btn btn-solid download-run" type="button" disabled={busy} onClick={runManual}>
          <DownloadIcon className="download-run-icon" />
          {busy ? "Montando…" : "Baixar manual"}
        </button>
      </header>

      <div className="download-docs-grid">
          {DOWNLOAD_DOCS.map((doc, index) => {
            const active = doc.id === selectedId;
            return (
              <article
                key={doc.id}
                id={`docs-${doc.id}`}
                className={downloadBlockClass(
                  index,
                  active
                    ? "card download-card download-doc-card is-active"
                    : "card download-card download-doc-card",
                )}
                style={downloadBlockVars(index)}
              >
                <header>
                  <span className="download-card-mark" style={{ color: doc.accent }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                <div>
                  <h3>{doc.title}</h3>
                  <p className="kicker">{doc.mode}</p>
                </div>
              </header>
              <p>{doc.summary}</p>
              <p className="download-file">
                <strong>{doc.fileName}</strong>
                <span>{doc.audience}</span>
              </p>
              <div className="download-card-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setSelectedId(doc.id);
                    window.requestAnimationFrame(() => {
                      document.getElementById("docs-read")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }}
                >
                  Ler modo
                </button>
                <button
                  className="btn btn-solid"
                  type="button"
                  disabled={busy}
                  onClick={() => runDoc(doc)}
                >
                  <DownloadIcon className="download-run-icon" />
                  Download
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selected ? (
        <article
          className={downloadBlockClass(1, "download-doc-read")}
          style={downloadBlockVars(1)}
          id="docs-read"
          aria-label={`Manual ${selected.title}`}
        >
          <header>
            <p className="kicker">{selected.mode}</p>
            <h3>{selected.title}</h3>
            <p>{selected.summary}</p>
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
          {selected.sections.map((section) => (
            <section key={section.heading}>
              <h4>{section.heading}</h4>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
          <div className="download-card-actions">
            <Link className="btn" to={selected.route}>
              Abrir {selected.title}
            </Link>
            <button
              className="btn btn-solid"
              type="button"
              disabled={busy}
              onClick={() => runDoc(selected)}
            >
              <DownloadIcon className="download-run-icon" />
              Baixar este modo
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
