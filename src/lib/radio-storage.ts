import type { RadioUpload } from "../types/radio";

const DB_NAME = "mamute.radio";
const DB_VERSION = 1;
const STORE = "uploads";
const MAX_BYTES = 20 * 1024 * 1024;

interface StoredUpload extends RadioUpload {
  data: ArrayBuffer;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || "Faixa sem título";
}

export async function listRadioUploads(): Promise<RadioUpload[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = (request.result as StoredUpload[]).map(({ data: _data, ...meta }) => meta);
      rows.sort((a, b) => b.createdAt - a.createdAt);
      resolve(rows);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to list uploads"));
  });
}

export async function getRadioUploadData(id: string): Promise<ArrayBuffer | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => {
      const row = request.result as StoredUpload | undefined;
      resolve(row?.data ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to read upload"));
  });
}

export async function saveRadioUpload(file: File, durationSec: number): Promise<RadioUpload> {
  if (!file.type.includes("audio") && !file.name.toLowerCase().endsWith(".mp3")) {
    throw new Error("Envie apenas arquivos MP3.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo acima de 20 MB. Use um MP3 menor.");
  }

  const data = await file.arrayBuffer();
  const upload: StoredUpload = {
    id: crypto.randomUUID(),
    title: stripExtension(file.name),
    artist: "Upload Mamute FM",
    durationSec,
    createdAt: Date.now(),
    sizeBytes: file.size,
    data,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save upload"));
    tx.objectStore(STORE).put(upload);
  });

  const { data: _data, ...meta } = upload;
  return meta;
}

export async function deleteRadioUpload(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete upload"));
    tx.objectStore(STORE).delete(id);
  });
}

export function decodeUploadDuration(ctx: AudioContext, data: ArrayBuffer): Promise<number> {
  return ctx.decodeAudioData(data.slice(0)).then((buffer) => buffer.duration);
}
