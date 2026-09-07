import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  hasCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from "../../lib/cookie-consent";

function syncCookieBannerOffset(heightPx: number): void {
  document.documentElement.style.setProperty("--cookie-banner-h", `${heightPx}px`);
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(!hasCookieConsent());
  }, []);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!visible || !banner) {
      syncCookieBannerOffset(0);
      return;
    }

    const update = () => syncCookieBannerOffset(banner.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      syncCookieBannerOffset(0);
    };
  }, [visible]);

  const respond = (choice: CookieConsentChoice) => {
    saveCookieConsent(choice);
    setVisible(false);
    syncCookieBannerOffset(0);
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="cookie-banner"
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-live="polite"
    >
      <div className="cookie-banner-inner">
        <div className="cookie-banner-copy">
          <p className="cookie-banner-kicker">Cookies e armazenamento local</p>
          <h2 id="cookie-banner-title">Sua privacidade na cabine MIXORA</h2>
          <p>
            Usamos armazenamento local no navegador para salvar perfil de DJ e progresso da academia.
            Ao aceitar, você concorda com o uso descrito na nossa política de
            cookies. Serviços de terceiros (como players de vídeo) podem definir cookies próprios quando
            você os utiliza.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button type="button" className="btn btn-solid" onClick={() => respond("all")}>
            Aceitar
          </button>
          <button type="button" className="btn" onClick={() => respond("essential")}>
            Apenas necessários
          </button>
          <Link className="cookie-banner-link" to="/politicas#cookies">
            Ver política de cookies
          </Link>
        </div>
      </div>
    </div>
  );
}
