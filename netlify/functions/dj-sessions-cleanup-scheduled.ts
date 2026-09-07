import type { Config } from "@netlify/functions";
import { cleanupExpiredSessions } from "./_shared/auth.js";

export default async () => {
  const removed = await cleanupExpiredSessions();
  console.log(`dj-sessions-cleanup: removed ${removed} expired session(s)`);
  return new Response(JSON.stringify({ ok: true, removed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  schedule: "@daily",
};
