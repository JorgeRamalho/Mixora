import type { DjProfileRow } from "../../../db/schema.js";
import type { DjProfile } from "../../../src/types/dj.js";
import { corsHeaders } from "./cors.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(),
    },
  });
}

export function errorResponse(message: string, status = 400, code?: string): Response {
  return jsonResponse({ ok: false, error: message, code }, status);
}

export function profileRowToClient(row: DjProfileRow, email: string): DjProfile {
  return {
    fullName: row.fullName,
    artistName: row.artistName,
    pronouns: row.pronouns,
    birthDate: row.birthDate,
    nationality: row.nationality,
    city: row.city,
    country: row.country,
    languages: row.languages,
    email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    bio: row.bio,
    experienceLevel: row.experienceLevel as DjProfile["experienceLevel"],
    yearsDJing: row.yearsDJing,
    genres: row.genres,
    influences: row.influences,
    setsPerMonth: row.setsPerMonth,
    preferredVenue: row.preferredVenue,
    hardware: row.hardware as DjProfile["hardware"],
    brands: row.brands,
    software: row.software,
    headphones: row.headphones,
    instagram: row.instagram,
    soundcloud: row.soundcloud,
    mixcloud: row.mixcloud,
    beatport: row.beatport,
    spotify: row.spotify,
    youtube: row.youtube,
    tiktok: row.tiktok,
    deezer: row.deezer,
    agencies: row.agencies,
    labels: row.labels,
    residencies: row.residencies,
    travel: row.travel,
    feeRange: row.feeRange,
    pressKit: row.pressKit,
    goals: row.goals,
    weeklyHours: row.weeklyHours,
    mentorship: row.mentorship,
    challenges: row.challenges,
    terms: row.termsAccepted,
    imageRights: row.imageRights,
    newsletter: row.newsletter,
    over18: row.over18,
  };
}

export function profileInputToRow(profile: DjProfile, selectedPlan?: string | null) {
  return {
    fullName: profile.fullName.trim(),
    artistName: profile.artistName.trim(),
    pronouns: profile.pronouns.trim(),
    birthDate: profile.birthDate,
    nationality: profile.nationality.trim(),
    city: profile.city.trim(),
    country: profile.country.trim(),
    languages: profile.languages.trim(),
    phone: profile.phone.trim(),
    whatsapp: profile.whatsapp.trim(),
    website: profile.website.trim(),
    bio: profile.bio.trim(),
    experienceLevel: profile.experienceLevel,
    yearsDJing: profile.yearsDJing,
    genres: profile.genres,
    influences: profile.influences.trim(),
    setsPerMonth: profile.setsPerMonth,
    preferredVenue: profile.preferredVenue,
    hardware: profile.hardware,
    brands: profile.brands.trim(),
    software: profile.software,
    headphones: profile.headphones.trim(),
    instagram: profile.instagram.trim(),
    soundcloud: profile.soundcloud.trim(),
    mixcloud: profile.mixcloud.trim(),
    beatport: profile.beatport.trim(),
    spotify: profile.spotify.trim(),
    youtube: profile.youtube.trim(),
    tiktok: profile.tiktok.trim(),
    deezer: profile.deezer.trim(),
    agencies: profile.agencies.trim(),
    labels: profile.labels.trim(),
    residencies: profile.residencies.trim(),
    travel: profile.travel,
    feeRange: profile.feeRange.trim(),
    pressKit: profile.pressKit.trim(),
    goals: profile.goals.trim(),
    weeklyHours: profile.weeklyHours.trim(),
    mentorship: profile.mentorship,
    challenges: profile.challenges.trim(),
    termsAccepted: profile.terms,
    imageRights: profile.imageRights,
    newsletter: profile.newsletter,
    over18: profile.over18,
    selectedPlan: selectedPlan ?? null,
    updatedAt: new Date(),
  };
}

export function isValidProfile(profile: Partial<DjProfile>): string | null {
  if (!profile.fullName?.trim()) return "Nome completo é obrigatório.";
  if (!profile.artistName?.trim()) return "Nome artístico é obrigatório.";
  if (!profile.city?.trim()) return "Cidade é obrigatória.";
  if (!profile.country?.trim()) return "País é obrigatório.";
  if (!profile.email?.trim()) return "E-mail é obrigatório.";
  if (!profile.bio?.trim()) return "Bio é obrigatória.";
  if (!profile.genres?.length) return "Selecione pelo menos um gênero.";
  if (!profile.hardware?.length) return "Selecione pelo menos um tipo de hardware.";
  if (!profile.over18) return "Confirme que tem 18 anos ou mais.";
  if (!profile.terms) return "Aceite os termos de uso.";
  return null;
}
