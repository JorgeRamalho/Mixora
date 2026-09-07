import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Hero } from "../components/hero/Hero";
import { StatusBar } from "../components/layout/StatusBar";
import { HarmonyPanel } from "../components/home/HarmonyPanel";
import { CabinetLayersSection } from "../components/home/CabinetLayersSection";
import { VisorTechSection } from "../components/home/VisorTechSection";
import { BoothFaqSection } from "../components/plans/BoothFaqSection";
import { PlansSection } from "../components/plans/PlansSection";

const LEGAL_HASHES = new Set(["#privacidade", "#cookies"]);

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.hash) return;
    if (LEGAL_HASHES.has(location.hash)) {
      navigate(`/politicas${location.hash}`, { replace: true });
      return;
    }
    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash, navigate]);

  return (
    <div className="page">
      <Hero />
      <StatusBar />
      <HarmonyPanel />
      <VisorTechSection />
      <CabinetLayersSection />
      <BoothFaqSection />
      <PlansSection />
    </div>
  );
}
