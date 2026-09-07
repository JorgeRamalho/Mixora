import { loadSession } from "./dj-auth";

/** Edição do mural: só com sessão ativa e `?editar=1` (link do portal). */
export function isCadastroEditMode(searchParams: URLSearchParams): boolean {
  return Boolean(loadSession() && searchParams.get("editar") === "1");
}
