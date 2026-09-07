import { useEffect } from "react";
import { useLocation } from "react-router";
import { LegalSection } from "../components/legal/LegalSection";

export function LegalPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <div className="page legal-page">
      <LegalSection />
    </div>
  );
}
