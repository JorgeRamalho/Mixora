import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "../components/layout/AppShell";
import { appBasename } from "../lib/base";
import { AcademyPage } from "../pages/AcademyPage";
import { CadastroPage } from "../pages/CadastroPage";
import { ConfirmEmailPage } from "../pages/ConfirmEmailPage";
import { CatalogPage } from "../pages/CatalogPage";
import { DownloadPage } from "../pages/DownloadPage";
import { DjPage } from "../pages/DjPage";
import { HomePage } from "../pages/HomePage";
import { HarmonyPage } from "../pages/HarmonyPage";
import { LegalPage } from "../pages/LegalPage";
import { MixerPage } from "../pages/MixerPage";

const TITLES: Record<string, string> = {
  "/": "MIXORAPlayerDJ — Dois decks. Uma harmonia.",
  "/mixer": "Mixer CDJ e controladora — MIXORAPlayerDJ",
  "/academia": "Academia DJ · iniciante ao avançado — MIXORAPlayerDJ",
  "/harmonia": "Harmonia · roda Camelot — MIXORAPlayerDJ",
  "/catalogo": "Plataformas · Beatport, Deezer, SoundCloud, YouTube e Spotify — MIXORAPlayerDJ",
  "/download": "Download · Windows, macOS, Linux, Android e iOS — MIXORAPlayerDJ",
  "/cadastro": "Cadastro DJ · perfil de cabine — MIXORAPlayerDJ",
  "/cadastro/confirmar-email": "Confirmar e-mail · cadastro DJ — MIXORAPlayerDJ",
  "/dj": "Área do DJ · login do portal — MIXORAPlayerDJ",
  "/politicas": "Política de privacidade e cookies — MIXORAPlayerDJ",
};

function RouteMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.endsWith("/index.html") ? "/" : location.pathname;
    document.title = TITLES[path] ?? "MIXORAPlayerDJ";
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter basename={appBasename()}>
      <RouteMeta />
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/index.html" element={<HomePage />} />
          <Route path="/mixer" element={<MixerPage />} />
          <Route path="/academia" element={<AcademyPage />} />
          <Route path="/harmonia" element={<HarmonyPage />} />
          <Route path="/radio" element={<Navigate to="/" replace />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/cadastro/confirmar-email" element={<ConfirmEmailPage />} />
          <Route path="/dj" element={<DjPage />} />
          <Route path="/politicas" element={<LegalPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
