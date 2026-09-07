import type { APIRequestContext } from "@playwright/test";
import type { DjProfile } from "../../src/types/dj";

const API_BASE = process.env.MAMUTE_API_URL ?? "http://127.0.0.1:8888";

export function uniqueEmail(suffix: string): string {
  const stamp = `${Date.now()}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `auto-${stamp}@mamute.test`;
}

export function buildTestProfile(suffix: string, email: string): DjProfile {
  return {
    fullName: `Nome ${suffix}`,
    artistName: `DJ ${suffix}`,
    pronouns: "",
    birthDate: "",
    nationality: "",
    city: "São Paulo",
    country: "Brasil",
    languages: "Português",
    email,
    phone: "",
    whatsapp: "",
    website: "",
    bio: `Bio automática ${suffix}`,
    experienceLevel: "iniciante",
    yearsDJing: "1",
    genres: ["Techno"],
    influences: "",
    setsPerMonth: "2",
    preferredVenue: "clube",
    hardware: ["cdj"],
    brands: "",
    software: ["MIXORAPlayerDJ Mixer"],
    headphones: "",
    instagram: `@${suffix}`,
    soundcloud: "",
    mixcloud: "",
    beatport: "",
    spotify: "",
    youtube: "",
    tiktok: "",
    deezer: "",
    agencies: "",
    labels: "",
    residencies: "",
    travel: "local",
    feeRange: "",
    pressKit: "",
    goals: "Automatizar o fluxo de cadastro",
    weeklyHours: "5",
    mentorship: false,
    challenges: "",
    terms: true,
    imageRights: false,
    newsletter: false,
    over18: true,
  };
}

type RegisterResponse = {
  ok: boolean;
  devCode?: string;
  emailSent?: boolean;
  emailVerificationRequired?: boolean;
  error?: string;
};

type ConfirmResponse = {
  ok: boolean;
  token?: string;
  error?: string;
};

type LoginResponse = {
  ok: boolean;
  token?: string;
  error?: string;
  code?: string;
};

export async function registerViaApi(
  request: APIRequestContext,
  profile: DjProfile,
  password: string,
): Promise<RegisterResponse & { email: string }> {
  const response = await request.post(`${API_BASE}/api/dj/register`, {
    data: { profile, password },
  });
  const body = (await response.json()) as RegisterResponse;
  return { ...body, email: profile.email };
}

export async function sendVerificationCodeViaApi(
  request: APIRequestContext,
  email: string,
  password?: string,
): Promise<{ ok: boolean; devCode?: string; emailSent?: boolean; error?: string }> {
  const response = await request.post(`${API_BASE}/api/dj/send-verification-code`, {
    data: { email, password },
  });
  return (await response.json()) as { ok: boolean; devCode?: string; emailSent?: boolean; error?: string };
}

export async function confirmCodeViaApi(
  request: APIRequestContext,
  email: string,
  code: string,
): Promise<ConfirmResponse> {
  const response = await request.post(`${API_BASE}/api/dj/confirm-verification-code`, {
    data: { email, code },
  });
  return (await response.json()) as ConfirmResponse;
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await request.post(`${API_BASE}/api/dj/login`, {
    data: { email, password },
  });
  return (await response.json()) as LoginResponse;
}

export async function waitForHealthyApi(timeoutMs = 90_000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${API_BASE}/api/dj/health`, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) {
        const body = (await response.json()) as { ok?: boolean };
        if (body.ok) return true;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  return false;
}
