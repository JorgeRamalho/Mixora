/**
 * Indica se a rota atual é a cabine do mixer, respeitando basename em produção.
 *
 * @param pathname `location.pathname` do React Router.
 */
export function isMixerRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === "/mixer" || normalized.endsWith("/mixer");
}
