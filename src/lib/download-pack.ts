import { BRAND } from "../data/brand";
import {
  DOWNLOAD_DOCS,
  renderDocsIndex,
  renderDownloadDoc,
} from "../data/download-docs";
import { DOWNLOAD_VERSION, packById } from "../data/downloads";
import { appBasename } from "./base";
import { zipStore, type ZipEntry } from "./zip-store";
import type { DownloadDocId, DownloadOsFamily, DownloadPack, DownloadPackId } from "../types";

function appUrl(): string {
  const base = appBasename();
  const origin = window.location.origin;
  if (base === "/") return `${origin}/`;
  return `${origin}${base}`;
}

function readme(pack: DownloadPack, url: string): string {
  const steps = pack.installSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return [
    `${BRAND.product} ${DOWNLOAD_VERSION}`,
    `${pack.name} · ${pack.fileKind}`,
    "",
    pack.summary,
    "",
    `Cabine: ${url}`,
    `Requisitos: ${pack.requirements}`,
    "",
    "Instalação",
    steps,
    "",
    "A pasta docs/ traz o manual dos modos profissionais: Mixer CDJ, DJ ONLINE, Harmonia, Academia, Plataformas, Área DJ, Visor e MIDI.",
    "",
    "Este pacote é o lançador web da cabine MIXORA. Não substitui rekordbox, Serato nem licenças oficiais de streaming.",
    `${BRAND.os} · ${BRAND.slogan}`,
  ].join("\n");
}

function windowsUrlFile(url: string): string {
  return `[InternetShortcut]\r\nURL=${url}\r\n`;
}

function windowsBat(url: string): string {
  return `@echo off\r\nstart "" "${url}"\r\n`;
}

function macCommand(url: string): string {
  return `#!/bin/bash\nopen "${url}"\n`;
}

function macWebloc(url: string): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`,
    `<plist version="1.0">`,
    `<dict>`,
    `  <key>URL</key>`,
    `  <string>${url}</string>`,
    `</dict>`,
    `</plist>`,
    "",
  ].join("\n");
}

function linuxScript(url: string): string {
  return `#!/usr/bin/env bash\nxdg-open "${url}"\n`;
}

function linuxDesktop(url: string): string {
  return [
    "[Desktop Entry]",
    "Type=Application",
    `Name=${BRAND.product}`,
    `Comment=${BRAND.slogan}`,
    `Exec=xdg-open ${url}`,
    "Icon=audio-headphones",
    "Terminal=false",
    "Categories=AudioVideo;Audio;",
    "",
  ].join("\n");
}

function mobileHtml(url: string, pack: DownloadPack): string {
  return [
    "<!doctype html>",
    '<html lang="pt-BR">',
    "<head>",
    '<meta charset="UTF-8" />',
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${BRAND.product}</title>`,
    `<meta http-equiv="refresh" content="0;url=${url}" />`,
    "</head>",
    "<body>",
    `<p>${pack.name}: <a href="${url}">${BRAND.product}</a></p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function docsEntries(): ZipEntry[] {
  const numbered = DOWNLOAD_DOCS.map((doc, index) => ({
    name: `docs/${String(index + 1).padStart(2, "0")}-${doc.id}.txt`,
    content: renderDownloadDoc(doc),
  }));
  return [{ name: "docs/00-indice.txt", content: renderDocsIndex() }, ...numbered];
}

function familyFiles(family: DownloadOsFamily, url: string, pack: DownloadPack): ZipEntry[] {
  switch (family) {
    case "windows":
      return [
        { name: "INSTALAR.txt", content: readme(pack, url) },
        { name: "MIXORAPlayerDJ.url", content: windowsUrlFile(url) },
        { name: "MIXORAPlayerDJ.bat", content: windowsBat(url) },
        ...docsEntries(),
      ];
    case "macos":
      return [
        { name: "INSTALAR.txt", content: readme(pack, url) },
        { name: "MIXORAPlayerDJ.webloc", content: macWebloc(url) },
        { name: "MIXORAPlayerDJ.command", content: macCommand(url) },
        ...docsEntries(),
      ];
    case "linux":
      return [
        { name: "INSTALAR.txt", content: readme(pack, url) },
        { name: "mixora-player-dj.sh", content: linuxScript(url) },
        { name: "mixora-player-dj.desktop", content: linuxDesktop(url) },
        ...docsEntries(),
      ];
    case "android":
    case "ios":
      return [
        { name: "INSTALAR.txt", content: readme(pack, url) },
        { name: "MIXORAPlayerDJ.html", content: mobileHtml(url, pack) },
        ...docsEntries(),
      ];
    default: {
      const _never: never = family;
      return _never;
    }
  }
}

export interface DownloadResult {
  fileName: string;
  bytes: number;
}

export function triggerBlobDownload(fileName: string, blob: Blob): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 2500);
}

export function downloadPlatformPack(packId: DownloadPackId): DownloadResult {
  const pack = packById(packId);
  if (!pack) {
    throw new Error("Pacote de download não encontrado");
  }
  const url = appUrl();
  const blob = zipStore(familyFiles(pack.family, url, pack));
  triggerBlobDownload(pack.fileName, blob);
  return { fileName: pack.fileName, bytes: blob.size };
}

export function downloadDocFile(docId: DownloadDocId): DownloadResult {
  const doc = DOWNLOAD_DOCS.find((item) => item.id === docId);
  if (!doc) {
    throw new Error("Documentação não encontrada");
  }
  const content = renderDownloadDoc(doc);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(doc.fileName, blob);
  return { fileName: doc.fileName, bytes: blob.size };
}

export function downloadDocsManual(): DownloadResult {
  const blob = zipStore(docsEntries());
  const fileName = `${BRAND.product}-${DOWNLOAD_VERSION}-manual-modos-profissionais.zip`;
  triggerBlobDownload(fileName, blob);
  return { fileName, bytes: blob.size };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
