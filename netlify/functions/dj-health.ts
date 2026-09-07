import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { djAccounts } from "../../db/schema.js";
import { errorResponse, jsonResponse } from "./_shared/dj.js";
import { isNetlifyLocalDev } from "./_shared/email.js";

export default async (req: Request) => {
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    await db.select({ id: djAccounts.id }).from(djAccounts).limit(1);
    return jsonResponse({
      ok: true,
      db: true,
      localDev: isNetlifyLocalDev(),
      emailProvider: process.env.RESEND_API_KEY?.trim() ? "resend" : "dev-console",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable";
    return jsonResponse({ ok: false, db: false, error: message }, 503);
  }
};

export const config: Config = {
  path: "/api/dj/health",
  method: "GET",
};
