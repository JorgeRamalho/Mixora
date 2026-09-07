import type { DjProfile, ExperienceLevel } from "../types";

const KEY = "mamute.dj.profile";
const LEGACY_KEY = "playerdj.dj.profile";
const PLAN_KEY = "mamute.dj.selectedPlan";

export const EMPTY_PROFILE: DjProfile = {
  fullName: "",
  artistName: "",
  pronouns: "",
  birthDate: "",
  nationality: "",
  city: "",
  country: "Brasil",
  languages: "Português",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  bio: "",
  experienceLevel: "iniciante",
  yearsDJing: "0",
  genres: [],
  influences: "",
  setsPerMonth: "0",
  preferredVenue: "clube",
  hardware: [],
  brands: "",
  software: ["MIXORAPlayerDJ Mixer"],
  headphones: "",
  instagram: "",
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
  goals: "",
  weeklyHours: "3",
  mentorship: false,
  challenges: "",
  terms: false,
  imageRights: false,
  newsletter: true,
  over18: false,
};

export function loadProfile(): DjProfile {
  const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<DjProfile>) };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function saveProfile(profile: DjProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

/** Perfil em branco para nova ficha de cadastro (não infla o cartão de visita). */
export const BLANK_CADASTRO_PROFILE: DjProfile = {
  ...EMPTY_PROFILE,
  country: "",
  languages: "",
  weeklyHours: "",
  yearsDJing: "",
  setsPerMonth: "",
  software: [],
};

export function loadSelectedPlan(): string | null {
  const raw = localStorage.getItem(PLAN_KEY);
  return raw && raw.trim() ? raw : null;
}

export function saveSelectedPlan(plan: string | null): void {
  if (!plan) {
    localStorage.removeItem(PLAN_KEY);
    return;
  }
  localStorage.setItem(PLAN_KEY, plan);
}

export function isExperience(value: string): value is ExperienceLevel {
  return ["iniciante", "intermediario", "avancado", "profissional"].includes(value);
}
