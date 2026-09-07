ALTER TABLE "dj_accounts" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "dj_accounts" ADD COLUMN "email_verification_token" varchar(64);
ALTER TABLE "dj_accounts" ADD COLUMN "email_verification_expires_at" timestamp with time zone;
ALTER TABLE "dj_accounts" ADD COLUMN "email_verified_at" timestamp with time zone;

-- Contas já existentes antes da verificação por e-mail continuam com login imediato
UPDATE "dj_accounts"
SET "email_verified" = true, "email_verified_at" = NOW()
WHERE "email_verified" = false;
