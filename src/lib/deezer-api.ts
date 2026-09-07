const DEEZER_PROXY_BASE = "/api/deezer";
const DEEZER_PUBLIC_BASE = "https://api.deezer.com";

function buildDeezerUrl(base: string, path: string, params?: Record<string, string | number>): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = base.startsWith("http")
    ? new URL(`${base}${normalized}`)
    : new URL(`${base}${normalized}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  return base.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
}

export function deezerApiUrl(path: string, params?: Record<string, string | number>): string {
  return buildDeezerUrl(DEEZER_PROXY_BASE, path, params);
}

function liveServerDeezerProxy(): string | null {
  if (typeof window === "undefined") return null;
  if (window.location.port !== "5500") return null;
  return "http://127.0.0.1:5173/api/deezer";
}

export async function fetchDeezerJson<T>(path: string, params?: Record<string, string | number>): Promise<T | null> {
  const liveProxy = liveServerDeezerProxy();
  const urls = [
    ...(liveProxy ? [buildDeezerUrl(liveProxy, path, params)] : []),
    buildDeezerUrl(DEEZER_PROXY_BASE, path, params),
    buildDeezerUrl(DEEZER_PUBLIC_BASE, path, params),
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const type = response.headers.get("content-type") || "";
      if (type.includes("text/html")) continue;
      return (await response.json()) as T;
    } catch {
      /* tenta o próximo endpoint */
    }
  }

  return null;
}
