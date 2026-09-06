import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient da cabine: retry com backoff, sem refetch no foco, e networkMode
 * always para o mock funcionar mesmo "offline".
 */
export function createMixerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
        refetchOnWindowFocus: false,
        networkMode: "always",
        staleTime: 60_000,
      },
    },
  });
}
