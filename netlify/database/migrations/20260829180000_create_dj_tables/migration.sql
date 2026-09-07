CREATE TABLE "dj_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dj_accounts_email_unique" UNIQUE("email")
);

CREATE TABLE "dj_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "full_name" varchar(255) DEFAULT '' NOT NULL,
  "artist_name" varchar(255) DEFAULT '' NOT NULL,
  "pronouns" varchar(64) DEFAULT '' NOT NULL,
  "birth_date" varchar(32) DEFAULT '' NOT NULL,
  "nationality" varchar(128) DEFAULT '' NOT NULL,
  "city" varchar(128) DEFAULT '' NOT NULL,
  "country" varchar(128) DEFAULT '' NOT NULL,
  "languages" varchar(255) DEFAULT '' NOT NULL,
  "phone" varchar(64) DEFAULT '' NOT NULL,
  "whatsapp" varchar(64) DEFAULT '' NOT NULL,
  "website" text DEFAULT '' NOT NULL,
  "bio" text DEFAULT '' NOT NULL,
  "experience_level" varchar(32) DEFAULT 'iniciante' NOT NULL,
  "years_djing" varchar(16) DEFAULT '0' NOT NULL,
  "genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "influences" text DEFAULT '' NOT NULL,
  "sets_per_month" varchar(16) DEFAULT '0' NOT NULL,
  "preferred_venue" varchar(32) DEFAULT 'clube' NOT NULL,
  "hardware" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "brands" text DEFAULT '' NOT NULL,
  "software" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "headphones" varchar(255) DEFAULT '' NOT NULL,
  "instagram" text DEFAULT '' NOT NULL,
  "soundcloud" text DEFAULT '' NOT NULL,
  "mixcloud" text DEFAULT '' NOT NULL,
  "beatport" text DEFAULT '' NOT NULL,
  "spotify" text DEFAULT '' NOT NULL,
  "youtube" text DEFAULT '' NOT NULL,
  "tiktok" text DEFAULT '' NOT NULL,
  "deezer" text DEFAULT '' NOT NULL,
  "agencies" text DEFAULT '' NOT NULL,
  "labels" text DEFAULT '' NOT NULL,
  "residencies" text DEFAULT '' NOT NULL,
  "travel" varchar(32) DEFAULT 'local' NOT NULL,
  "fee_range" varchar(128) DEFAULT '' NOT NULL,
  "press_kit" text DEFAULT '' NOT NULL,
  "goals" text DEFAULT '' NOT NULL,
  "weekly_hours" varchar(16) DEFAULT '' NOT NULL,
  "mentorship" boolean DEFAULT false NOT NULL,
  "challenges" text DEFAULT '' NOT NULL,
  "terms_accepted" boolean DEFAULT false NOT NULL,
  "image_rights" boolean DEFAULT false NOT NULL,
  "newsletter" boolean DEFAULT false NOT NULL,
  "over_18" boolean DEFAULT false NOT NULL,
  "selected_plan" varchar(32),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "dj_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "token" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dj_sessions_token_unique" UNIQUE("token")
);

ALTER TABLE "dj_profiles" ADD CONSTRAINT "dj_profiles_account_id_dj_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."dj_accounts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "dj_sessions" ADD CONSTRAINT "dj_sessions_account_id_dj_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."dj_accounts"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "dj_sessions_account_id_idx" ON "dj_sessions" USING btree ("account_id");
CREATE INDEX "dj_sessions_expires_at_idx" ON "dj_sessions" USING btree ("expires_at");
