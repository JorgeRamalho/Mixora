import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const djAccounts = pgTable("dj_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 64 }),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at", { withTimezone: true }),
  emailVerificationCodeHash: varchar("email_verification_code_hash", { length: 64 }),
  emailVerificationCodeExpiresAt: timestamp("email_verification_code_expires_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordResetCodeHash: varchar("password_reset_code_hash", { length: 64 }),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const djProfiles = pgTable("dj_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => djAccounts.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull().default(""),
  artistName: varchar("artist_name", { length: 255 }).notNull().default(""),
  pronouns: varchar("pronouns", { length: 64 }).notNull().default(""),
  birthDate: varchar("birth_date", { length: 32 }).notNull().default(""),
  nationality: varchar("nationality", { length: 128 }).notNull().default(""),
  city: varchar("city", { length: 128 }).notNull().default(""),
  country: varchar("country", { length: 128 }).notNull().default(""),
  languages: varchar("languages", { length: 255 }).notNull().default(""),
  phone: varchar("phone", { length: 64 }).notNull().default(""),
  whatsapp: varchar("whatsapp", { length: 64 }).notNull().default(""),
  website: text("website").notNull().default(""),
  bio: text("bio").notNull().default(""),
  experienceLevel: varchar("experience_level", { length: 32 }).notNull().default("iniciante"),
  yearsDJing: varchar("years_djing", { length: 16 }).notNull().default("0"),
  genres: jsonb("genres").$type<string[]>().notNull().default([]),
  influences: text("influences").notNull().default(""),
  setsPerMonth: varchar("sets_per_month", { length: 16 }).notNull().default("0"),
  preferredVenue: varchar("preferred_venue", { length: 32 }).notNull().default("clube"),
  hardware: jsonb("hardware").$type<string[]>().notNull().default([]),
  brands: text("brands").notNull().default(""),
  software: jsonb("software").$type<string[]>().notNull().default([]),
  headphones: varchar("headphones", { length: 255 }).notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  soundcloud: text("soundcloud").notNull().default(""),
  mixcloud: text("mixcloud").notNull().default(""),
  beatport: text("beatport").notNull().default(""),
  spotify: text("spotify").notNull().default(""),
  youtube: text("youtube").notNull().default(""),
  tiktok: text("tiktok").notNull().default(""),
  deezer: text("deezer").notNull().default(""),
  agencies: text("agencies").notNull().default(""),
  labels: text("labels").notNull().default(""),
  residencies: text("residencies").notNull().default(""),
  travel: varchar("travel", { length: 32 }).notNull().default("local"),
  feeRange: varchar("fee_range", { length: 128 }).notNull().default(""),
  pressKit: text("press_kit").notNull().default(""),
  goals: text("goals").notNull().default(""),
  weeklyHours: varchar("weekly_hours", { length: 16 }).notNull().default(""),
  mentorship: boolean("mentorship").notNull().default(false),
  challenges: text("challenges").notNull().default(""),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  imageRights: boolean("image_rights").notNull().default(false),
  newsletter: boolean("newsletter").notNull().default(false),
  over18: boolean("over_18").notNull().default(false),
  selectedPlan: varchar("selected_plan", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const djSessions = pgTable(
  "dj_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => djAccounts.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dj_sessions_account_id_idx").on(table.accountId),
    index("dj_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const djAcademyProgress = pgTable("dj_academy_progress", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => djAccounts.id, { onDelete: "cascade" }),
  completedLessons: jsonb("completed_lessons").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DjAccount = typeof djAccounts.$inferSelect;
export type DjProfileRow = typeof djProfiles.$inferSelect;
export type DjSessionRow = typeof djSessions.$inferSelect;
export type DjAcademyProgressRow = typeof djAcademyProgress.$inferSelect;
