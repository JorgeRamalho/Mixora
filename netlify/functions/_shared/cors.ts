import { isNetlifyLocalDev } from "./email.js";

export function corsHeaders(): Record<string, string> {
  if (!isNetlifyLocalDev()) return {};
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
