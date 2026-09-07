ALTER TABLE "dj_accounts" ADD COLUMN "email_verification_code_hash" varchar(64);
ALTER TABLE "dj_accounts" ADD COLUMN "email_verification_code_expires_at" timestamp with time zone;
ALTER TABLE "dj_accounts" ADD COLUMN "password_reset_code_hash" varchar(64);
ALTER TABLE "dj_accounts" ADD COLUMN "password_reset_expires_at" timestamp with time zone;
