export type TracksApiMode = "mock" | "live";

const STATIC_FRONT_PORTS = new Set(["5500", "4173"]);
const DEFAULT_LIVE_ORIGIN = "http://127.0.0.1:8765";

/**
 * Lê o modo da API de faixas. Sem variável, o Mamute usa mock para o CI e o
 * desenvolvimento não dependerem do MusicDiscover.
 */
export function tracksApiMode(): TracksApiMode {
  const raw = readEnv("VITE_TRACKS_API_MODE")?.trim().toLowerCase();
  return raw === "live" ? "live" : "mock";
}

/**
 * Origem do backend live. No Vite em :5173 a string vazia deixa os paths
 * relativos, e o proxy encaminha `/api/tracks` sem CORS.
 *
 * Nas portas estáticas (preview/live), o front não tem proxy, e por isso o
 * helper aponta para a origem do FastAPI.
 */
export function resolveTracksApiBase(): string {
  const configured = readEnv("VITE_TRACKS_API_BASE")?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  const { port, protocol, hostname } = window.location;
  if (!STATIC_FRONT_PORTS.has(port)) return "";
  const host = hostname === "localhost" ? "localhost" : "127.0.0.1";
  return `${protocol}//${host}:8765`;
}

/**
 * Origem usada só como fallback documentado do proxy Vite.
 */
export function defaultLiveOrigin(): string {
  return DEFAULT_LIVE_ORIGIN;
}

/**
 * Latência artificial do mock, para a UI exercitar skeleton sem backend.
 *
 * Zero é o padrão, porque os testes e o LOAD da cabine não devem esperar.
 */
export function mockDelayMs(): number {
  const raw = readEnv("VITE_TRACKS_API_MOCK_DELAY_MS");
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Junta base e path sem duplicar barra.
 *
 * @param base Origem vazia (paths relativos) ou absoluta.
 * @param path Caminho começando em `/`.
 */
export function joinApiUrl(base: string, path: string): string {
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

function readEnv(key: keyof ImportMetaEnv): string | undefined {
  const env = (import.meta as ImportMeta).env;
  return env?.[key];
}
