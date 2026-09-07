CREATE TABLE "dj_academy_progress" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "completed_lessons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "dj_academy_progress" ADD CONSTRAINT "dj_academy_progress_account_id_dj_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."dj_accounts"("id") ON DELETE cascade ON UPDATE no action;
