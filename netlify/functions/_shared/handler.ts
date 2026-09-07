import { errorResponse } from "./dj.js";

function databaseErrorMessage(): string {
  return "Banco de dados indisponível. Ative a Netlify Database (npx netlify database init), defina NETLIFY_DB_URL/DATABASE_URL ou rode npm run db:repair.";
}

export async function runHandler(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error("[mamute-dj]", error);
    const detail = error instanceof Error ? error.message : String(error);
    const isDatabase =
      detail.includes("Failed query") ||
      detail.includes("ECONNREFUSED") ||
      detail.includes("connection") ||
      detail.includes("connection string") ||
      detail.includes("NETLIFY_DB_URL") ||
      detail.includes("NETLIFY_DATABASE");
    return errorResponse(
      isDatabase ? databaseErrorMessage() : "Erro interno no servidor. Tente novamente em alguns minutos.",
      500,
      isDatabase ? "DATABASE_UNAVAILABLE" : "SERVER_ERROR",
    );
  }
}
