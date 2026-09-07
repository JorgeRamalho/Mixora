import type { Config } from "@netlify/functions";
import { corsPreflightResponse } from "./_shared/cors.js";

export default async () => corsPreflightResponse();

export const config: Config = {
  path: [
    "/api/dj/health",
    "/api/dj/register",
    "/api/dj/login",
    "/api/dj/logout",
    "/api/dj/profile",
    "/api/dj/verify-email",
    "/api/dj/resend-verification",
    "/api/dj/send-verification-code",
    "/api/dj/confirm-verification-code",
    "/api/dj/forgot-password",
    "/api/dj/reset-password",
    "/api/dj/academy-progress",
  ],
  method: "OPTIONS",
};
