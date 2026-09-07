import type { DjProfile } from "../types";
import type { DjSession } from "./dj-auth";

const TOKEN_KEY = "mamute.dj.api.token";
const TOKEN_EXPIRES_KEY = "mamute.dj.api.tokenExpires";

export type ApiError = { ok: false; error: string; code?: string };
type RegisterOk = {
  ok: true;
  mode: "created" | "updated";
  emailVerificationRequired: boolean;
  emailSent?: boolean;
  message?: string;
  profile: DjProfile;
  token?: string;
  expiresAt?: string;
  devCode?: string;
};
type LoginOk = {
  ok: true;
  token: string;
  expiresAt: string;
  session: DjSession;
  profile: DjProfile;
};
type VerifyEmailOk = {
  ok: true;
  token: string;
  expiresAt: string;
  session: DjSession;
  profile: DjProfile;
};
type ResendVerificationOk = {
  ok: true;
  alreadyVerified: boolean;
  emailSent?: boolean;
  message: string;
  devCode?: string;
};
type SendCodeOk = {
  ok: true;
  alreadyVerified?: boolean;
  emailSent?: boolean;
  cooldownMs?: number;
  message: string;
  devCode?: string;
};
type ConfirmCodeOk = {
  ok: true;
  token: string;
  expiresAt: string;
  session: DjSession;
  profile: DjProfile;
};
type ProfileOk = {
  ok: true;
  profile: DjProfile;
  selectedPlan: string | null;
};
type AcademyProgressOk = {
  ok: true;
  completedLessons: string[];
};

function authHeaders(): HeadersInit {
  const token = loadApiToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function saveApiToken(token: string, expiresAt: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
}

export function loadApiToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiresAt = sessionStorage.getItem(TOKEN_EXPIRES_KEY);
  if (!token || !expiresAt) return null;
  if (Date.now() >= Date.parse(expiresAt)) {
    clearApiToken();
    return null;
  }
  return token;
}

export function clearApiToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
}

export class ApiUnavailableError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

const STATIC_FRONT_PORTS = new Set(["5500", "4173"]);

function apiCandidateUrls(path: string): string[] {
  const { port, protocol, hostname } = window.location;
  if (!STATIC_FRONT_PORTS.has(port)) return [path];
  const host = hostname === "localhost" ? "localhost" : "127.0.0.1";
  return [`${protocol}//${host}:8888${path}`, `${protocol}//${host}:5173${path}`];
}

function apiUnavailableMessage(): string {
  const port = window.location.port;
  if (STATIC_FRONT_PORTS.has(port)) {
    return "A API local não respondeu. Deixe npm run dev no ar (http://localhost:8888) e clique de novo — pode continuar neste mesmo endereço.";
  }
  return "O servidor da API não respondeu. Rode npm run dev no terminal e abra http://localhost:8888/dj.";
}

async function readApiResponse(response: Response): Promise<Response> {
  const type = response.headers.get("content-type") ?? "";
  if (type.toLowerCase().includes("application/json")) {
    return response;
  }
  const fallbackText = await response.text().catch(() => "");
  if (fallbackText.includes("NETLIFY_DB_URL")) {
    throw new ApiUnavailableError(
      "Banco local não iniciado. No terminal: npm run dev — depois abra http://localhost:8888/dj.",
    );
  }
  if (response.status >= 500) {
    throw new ApiUnavailableError(
      "O servidor respondeu com erro. Use npm run dev (não dev:vite), confira npm run db:migrate e configure RESEND_API_KEY no .env.",
    );
  }
  throw new ApiUnavailableError(apiUnavailableMessage());
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const urls = apiCandidateUrls(input);
  let lastError: ApiUnavailableError | null = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, init);
      return await readApiResponse(response);
    } catch (error) {
      if (error instanceof ApiUnavailableError && error.message.includes("Banco local")) {
        throw error;
      }
      lastError =
        error instanceof ApiUnavailableError ? error : new ApiUnavailableError(apiUnavailableMessage());
    }
  }
  throw lastError ?? new ApiUnavailableError(apiUnavailableMessage());
}

async function parseJson<T>(response: Response): Promise<T | ApiError> {
  try {
    return (await response.json()) as T | ApiError;
  } catch {
    return { ok: false, error: "Resposta inválida do servidor." };
  }
}

export async function registerProfile(
  profile: DjProfile,
  password: string,
  selectedPlan?: string | null,
): Promise<RegisterOk | ApiError> {
  const response = await apiFetch("/api/dj/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, password, selectedPlan }),
  });
  const data = await parseJson<RegisterOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    if (!data.emailVerificationRequired && data.token && data.expiresAt) {
      saveApiToken(data.token, data.expiresAt);
    }
    return data;
  }
  return { ok: false, error: "Não foi possível gravar o cadastro." };
}

export async function loginProfile(
  email: string,
  password: string,
): Promise<LoginOk | ApiError> {
  const response = await apiFetch("/api/dj/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<LoginOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    saveApiToken(data.token, data.expiresAt);
    return data;
  }
  return { ok: false, error: "Não foi possível entrar." };
}

export async function verifyEmailToken(token: string): Promise<VerifyEmailOk | ApiError> {
  const response = await apiFetch("/api/dj/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await parseJson<VerifyEmailOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    saveApiToken(data.token, data.expiresAt);
    return data;
  }
  return { ok: false, error: "Não foi possível confirmar o e-mail." };
}

export async function resendVerificationEmail(
  email: string,
  password: string,
): Promise<ResendVerificationOk | ApiError> {
  const response = await apiFetch("/api/dj/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<ResendVerificationOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    return data;
  }
  return { ok: false, error: "Não foi possível reenviar o e-mail de confirmação." };
}

export async function sendVerificationCode(email: string): Promise<SendCodeOk | ApiError> {
  const response = await apiFetch("/api/dj/send-verification-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await parseJson<SendCodeOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    return data;
  }
  return { ok: false, error: "Não foi possível enviar o código de verificação." };
}

export async function confirmVerificationCode(
  email: string,
  code: string,
): Promise<ConfirmCodeOk | ApiError> {
  const response = await apiFetch("/api/dj/confirm-verification-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = await parseJson<ConfirmCodeOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    saveApiToken(data.token, data.expiresAt);
    return data;
  }
  return { ok: false, error: "Não foi possível confirmar o código." };
}

export async function requestPasswordReset(email: string): Promise<SendCodeOk | ApiError> {
  const response = await apiFetch("/api/dj/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await parseJson<SendCodeOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    return data;
  }
  return { ok: false, error: "Não foi possível enviar o código para redefinir a senha." };
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  password: string,
): Promise<ConfirmCodeOk | ApiError> {
  const response = await apiFetch("/api/dj/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, password }),
  });
  const data = await parseJson<ConfirmCodeOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    saveApiToken(data.token, data.expiresAt);
    return data;
  }
  return { ok: false, error: "Não foi possível redefinir a senha." };
}

export async function fetchRemoteProfile(): Promise<ProfileOk | ApiError | null> {
  const token = loadApiToken();
  if (!token) return null;

  const response = await apiFetch("/api/dj/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    clearApiToken();
    return null;
  }

  const data = await parseJson<ProfileOk>(response);
  if ("ok" in data && data.ok) {
    return data;
  }
  return data;
}

export async function logoutProfile(): Promise<{ ok: true } | ApiError> {
  const token = loadApiToken();
  if (!token) {
    return { ok: true };
  }

  try {
    const response = await apiFetch("/api/dj/logout", {
      method: "POST",
      headers: authHeaders(),
    });
    clearApiToken();
    const data = await parseJson<{ ok: true }>(response);
    if ("ok" in data && data.ok) {
      return data;
    }
    if ("error" in data) {
      return data;
    }
    return { ok: true };
  } catch {
    clearApiToken();
    return { ok: true };
  }
}

export async function fetchAcademyProgress(): Promise<AcademyProgressOk | ApiError | null> {
  const token = loadApiToken();
  if (!token) return null;

  const response = await apiFetch("/api/dj/academy-progress", {
    headers: authHeaders(),
  });

  if (response.status === 401) {
    clearApiToken();
    return null;
  }

  const data = await parseJson<AcademyProgressOk>(response);
  if ("ok" in data && data.ok) {
    return data;
  }
  return data;
}

export async function saveAcademyProgress(
  completedLessons: string[],
): Promise<AcademyProgressOk | ApiError> {
  const token = loadApiToken();
  if (!token) {
    return { ok: false, error: "Sem sessão ativa." };
  }

  const response = await apiFetch("/api/dj/academy-progress", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ completedLessons }),
  });

  const data = await parseJson<AcademyProgressOk>(response);
  if (!response.ok && "error" in data) {
    return data;
  }
  if ("ok" in data && data.ok) {
    return data;
  }
  return { ok: false, error: "Não foi possível gravar o progresso da academia." };
}

export function isApiReachableError(error: unknown): boolean {
  return error instanceof ApiUnavailableError || error instanceof TypeError;
}

export async function pingDjApi(): Promise<boolean> {
  try {
    const response = await apiFetch("/api/dj/health");
    const data = await parseJson<{ ok?: boolean }>(response);
    return "ok" in data && data.ok === true;
  } catch {
    return false;
  }
}

export function getApiConnectionMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiUnavailableError) {
    return error.message;
  }
  if (isApiReachableError(error)) {
    return apiUnavailableMessage();
  }
  return fallback;
}
