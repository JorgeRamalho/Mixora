import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { AppShell } from "../components/layout/AppShell";
import { appBasename } from "../lib/base";
import { createMixerQueryClient } from "../lib/tracks-api/query-client";
import { AcademyPage } from "../pages/AcademyPage";
import { CadastroPage } from "../pages/CadastroPage";
import { ConfirmEmailPage } from "../pages/ConfirmEmailPage";
import { CatalogPage } from "../pages/CatalogPage";
import { DjPage } from "../pages/DjPage";
import { HomePage } from "../pages/HomePage";
import { HarmonyPage } from "../pages/HarmonyPage";
import { LegalPage } from "../pages/LegalPage";
import { MixerPage } from "../pages/MixerPage";
import { RadioPage } from "../pages/RadioPage";

const TITLES: Record<string, string> = {
  "/": "Mamute DJPLAYER — Mixer player para DJs iniciantes e avançados",
  "/mixer": "Mixer CDJ e controladora — Mamute DJPLAYER",
  "/academia": "Academia DJ · iniciante ao avançado — Mamute DJPLAYER",
  "/harmonia": "Harmonia · roda Camelot — Mamute DJPLAYER",
  "/catalogo": "Plataformas · Beatport, Deezer, SoundCloud, YouTube e Spotify — Mamute DJPLAYER",
  "/cadastro": "Cadastro DJ · perfil de cabine — Mamute DJPLAYER",
  "/cadastro/confirmar-email": "Confirmar e-mail · cadastro DJ — Mamute DJPLAYER",
  "/dj": "Área do DJ · login do portal — Mamute DJPLAYER",
  "/politicas": "Política de privacidade e cookies — Mamute DJPLAYER",
};

function RouteMeta() {
  const location = useLocation();

  useEffect(() => {
    document.title = TITLES[location.pathname] ?? "Mamute DJPLAYER";
  }, [location.pathname]);

  return null;
}

export default function App() {
  const [queryClient] = useState(() => createMixerQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={appBasename()}>
        <RouteMeta />
        <AppShell>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mixer" element={<MixerPage />} />
          <Route path="/academia" element={<AcademyPage />} />
          <Route path="/harmonia" element={<HarmonyPage />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/cadastro/confirmar-email" element={<ConfirmEmailPage />} />
          <Route path="/dj" element={<DjPage />} />
          <Route path="/politicas" element={<LegalPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
