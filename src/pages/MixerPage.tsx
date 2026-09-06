import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MixerBoard } from "../components/mixer/MixerBoard";
import { createMixerQueryClient } from "../lib/tracks-api/query-client";

export function MixerPage() {
  const [queryClient] = useState(() => createMixerQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className="page page--mixer">
        <MixerBoard />
        <div className="page--mixer-copy">
          <p className="kicker">Modo equipamento · cabine profissional</p>
          <h1>CDJ Virtual + Dual CDJ + mixer integrado</h1>
          <p className="lede">
            EQ HIGH / MED / LOW com boost, sync, master tempo, loop, trim e filter.
            Browse local no USB de treino ou biblioteca remota — o LOAD baixa o stream
            e envia o áudio para a CDJ virtual.
          </p>
        </div>
      </div>
    </QueryClientProvider>
  );
}
