import { DOWNLOAD_PACKS } from "../data/downloads";
import type { DetectedClient, DownloadArch, DownloadOsFamily, DownloadPackId } from "../types";

function hasTouchMac(): boolean {
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function readArch(ua: string): DownloadArch | "unknown" {
  if (/arm64|aarch64|apple silicon/i.test(ua)) return "arm64";
  if (/x86_64|win64|wow64|amd64|x64|intel/i.test(ua)) return "x64";
  return "unknown";
}

function readFamily(ua: string): DownloadOsFamily | "unknown" {
  if (/iphone|ipad|ipod/i.test(ua) || hasTouchMac()) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows/i.test(ua)) return "windows";
  if (/mac os x|macintosh/i.test(ua)) return "macos";
  if (/cros|linux/i.test(ua)) return "linux";
  return "unknown";
}

function packFor(family: DownloadOsFamily | "unknown", arch: DownloadArch | "unknown"): DownloadPackId | null {
  switch (family) {
    case "windows":
      return arch === "arm64" ? "windows-arm64" : "windows-x64";
    case "macos":
      return arch === "x64" ? "macos-x64" : "macos-arm64";
    case "linux":
      return arch === "arm64" ? "linux-arm64" : "linux-x64";
    case "android":
      return "android";
    case "ios":
      return "ios";
    case "unknown":
      return null;
    default: {
      const _never: never = family;
      return _never;
    }
  }
}

function familyLabel(family: DownloadOsFamily | "unknown"): string {
  switch (family) {
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    case "android":
      return "Android";
    case "ios":
      return "iOS";
    case "unknown":
      return "sistema não identificado";
    default: {
      const _never: never = family;
      return _never;
    }
  }
}

export function detectClient(): DetectedClient {
  const ua = navigator.userAgent;
  const family = readFamily(ua);
  const arch = readArch(ua);
  const packId = packFor(family, arch);
  const pack = packId ? DOWNLOAD_PACKS.find((item) => item.id === packId) : undefined;
  return {
    family,
    arch,
    packId,
    label: pack?.name ?? familyLabel(family),
  };
}
