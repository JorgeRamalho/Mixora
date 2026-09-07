import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  decodeUploadDuration,
  deleteRadioUpload,
  getRadioUploadData,
  listRadioUploads,
  saveRadioUpload,
} from "../../lib/radio-storage";
import { radioEngine } from "../../lib/radio-engine";
import type { RadioEngineState, RadioUpload } from "../../types/radio";

type RadioLoopDeckProps = {
  activeUploadId: string | null;
  onSelectUpload: (upload: RadioUpload) => void;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RadioLoopDeck({ activeUploadId, onSelectUpload }: RadioLoopDeckProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<RadioUpload[]>([]);
  const [engineState, setEngineState] = useState<RadioEngineState>(radioEngine.state);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshUploads = useCallback(async () => {
    const items = await listRadioUploads();
    setUploads(items);
  }, []);

  useEffect(() => {
    void refreshUploads();
    return radioEngine.subscribe(setEngineState);
  }, [refreshUploads]);

  const playUpload = async (upload: RadioUpload) => {
    setStatus(null);
    setBusy(true);
    try {
      const data = await getRadioUploadData(upload.id);
      if (!data) throw new Error("Faixa não encontrada no dispositivo.");
      await radioEngine.loadBuffer(upload.id, data);
      onSelectUpload(upload);
      await radioEngine.togglePlay();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao carregar MP3.");
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus(null);
    setBusy(true);
    try {
      const ctx = await radioEngine.ensure();
      const durationSec = await decodeUploadDuration(ctx, await file.arrayBuffer());
      const saved = await saveRadioUpload(file, durationSec);
      await refreshUploads();
      await playUpload(saved);
      setStatus(`${saved.title} adicionada à cabine.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload inválido.");
    } finally {
      setBusy(false);
    }
  };

  const removeUpload = async (id: string) => {
    if (engineState.uploadId === id) radioEngine.stop();
    await deleteRadioUpload(id);
    await refreshUploads();
  };

  const duration = engineState.durationSec || 1;
  const loopStartPct = (engineState.loopStart / duration) * 100;
  const loopEndPct = (engineState.loopEnd / duration) * 100;

  return (
    <section className="radio-loop-deck radio-loop-deck--plain card" aria-label="Loop e uploads MP3">
      <header className="radio-loop-head">
        <div>
          <p className="kicker">Mamute FM · loop local</p>
          <h2 className="radio-loop-title">Upload MP3 &amp; loop</h2>
        </div>
        <button
          type="button"
          className="radio-loop-upload-btn"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Processando…" : "Enviar MP3"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,.mp3,audio/mp3"
          className="visually-hidden"
          onChange={(event) => void onFileChange(event)}
        />
      </header>

      {status ? <p className="radio-loop-status">{status}</p> : null}

      <div className="radio-loop-controls">
        <button
          type="button"
          className={`radio-loop-btn${engineState.playing ? " is-on" : ""}`}
          disabled={!engineState.uploadId || busy}
          onClick={() => void radioEngine.togglePlay()}
        >
          {engineState.playing ? "Pausar" : "Play"}
        </button>
        <button
          type="button"
          className={`radio-loop-btn${engineState.loopActive ? " is-on" : ""}`}
          disabled={!engineState.uploadId}
          onClick={() => radioEngine.setLoop(!engineState.loopActive)}
        >
          Loop
        </button>
        {engineState.uploadId ? (
          <span className="radio-loop-time">
            {formatTime(engineState.positionSec)} / {formatTime(engineState.durationSec)}
          </span>
        ) : null}
      </div>

      {engineState.uploadId ? (
        <div className="radio-loop-region">
          <label className="radio-loop-region-label">
            Início do loop
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={loopStartPct}
              disabled={!engineState.loopActive}
              onChange={(event) => {
                const start = (Number(event.target.value) / 100) * duration;
                radioEngine.setLoopRegion(start, engineState.loopEnd);
              }}
            />
          </label>
          <label className="radio-loop-region-label">
            Fim do loop
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={loopEndPct}
              disabled={!engineState.loopActive}
              onChange={(event) => {
                const end = (Number(event.target.value) / 100) * duration;
                radioEngine.setLoopRegion(engineState.loopStart, end);
              }}
            />
          </label>
        </div>
      ) : null}

      <ul className="radio-loop-list" aria-label="Faixas enviadas">
        {uploads.length === 0 ? (
          <li className="radio-loop-empty">Nenhum MP3 na cabine — envie uma faixa para loop local.</li>
        ) : (
          uploads.map((upload) => (
            <li key={upload.id}>
              <button
                type="button"
                className={
                  upload.id === activeUploadId ? "radio-loop-item is-active" : "radio-loop-item"
                }
                aria-pressed={upload.id === activeUploadId}
                disabled={busy}
                onClick={() => void playUpload(upload)}
              >
                <strong>{upload.title}</strong>
                <span>{upload.artist}</span>
                <span>{formatTime(upload.durationSec)}</span>
              </button>
              <button
                type="button"
                className="radio-loop-remove"
                aria-label={`Remover ${upload.title}`}
                onClick={() => void removeUpload(upload.id)}
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
