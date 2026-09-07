export type ExperienceLevel =
  | "iniciante"
  | "intermediario"
  | "avancado"
  | "profissional";

export type HardwareKind = "cdj" | "controladora" | "mixer" | "toca-discos";

export interface DjProfile {
  fullName: string;
  artistName: string;
  pronouns: string;
  birthDate: string;
  nationality: string;
  city: string;
  country: string;
  languages: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  bio: string;
  experienceLevel: ExperienceLevel;
  yearsDJing: string;
  genres: string[];
  influences: string;
  setsPerMonth: string;
  preferredVenue: string;
  hardware: HardwareKind[];
  brands: string;
  software: string[];
  headphones: string;
  instagram: string;
  soundcloud: string;
  mixcloud: string;
  beatport: string;
  spotify: string;
  youtube: string;
  tiktok: string;
  deezer: string;
  agencies: string;
  labels: string;
  residencies: string;
  travel: string;
  feeRange: string;
  pressKit: string;
  goals: string;
  weeklyHours: string;
  mentorship: boolean;
  challenges: string;
  terms: boolean;
  imageRights: boolean;
  newsletter: boolean;
  over18: boolean;
}
