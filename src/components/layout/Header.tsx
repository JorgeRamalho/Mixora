import { useEffect, useId, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { onDjSessionChange, sessionIdentityName } from "../../lib/dj-auth";
import { isMixerRoute } from "../../lib/mixer-route";
import { RadioFmEjectIcon, useRadioFmUi } from "../../lib/radio-fm-ui";
import { MixerHeaderMidi } from "./MixerHeaderMidi";

const SCROLL_ACTIVATE_PX = 10;

const NAV_LINKS = [
  { to: "/", label: "Início" },
  { to: "/harmonia", label: "Harmonia" },
  { to: "/academia", label: "Sala de Aula" },
  { to: "/mixer", label: "Mixer CDJ" },
  { to: "/catalogo", label: "Plataformas" },
] as const;

const AREA_DJ_LINK = { to: "/dj", label: "Área DJ" } as const;

const MARK_M =
  "M14.6 46.8V15.4h8.35L32 35.6 41.05 15.4H49.4v31.4h-7.05V29.6L32 48.8 21.65 29.6v17.2H14.6z";

function BrandMark() {
  const uid = useId().replace(/:/g, "");
  const ring = `${uid}-ring`;
  const letter = `${uid}-letter`;
  const bloom = `${uid}-bloom`;

  return (
    <span className="brand-mark" aria-hidden="true">
      <svg className="brand-mark-svg" viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id={ring} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cyan-hot)" />
            <stop offset="0.5" stopColor="var(--violet)" />
            <stop offset="1" stopColor="var(--magenta)" />
          </linearGradient>
          <linearGradient id={letter} x1="14" y1="32" x2="50" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cyan-hot)" />
            <stop offset="0.46" stopColor="var(--violet-hot)" />
            <stop offset="1" stopColor="var(--magenta)" />
          </linearGradient>
          <filter id={bloom} x="-18%" y="-18%" width="136%" height="136%">
            <feGaussianBlur stdDeviation="1.05" result="soft" />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="1.2" y="1.2" width="61.6" height="61.6" rx="14" fill="#070910" />
        <rect
          x="1.2"
          y="1.2"
          width="61.6"
          height="61.6"
          rx="14"
          stroke={`url(#${ring})`}
          strokeWidth="1.5"
        />
        <path d="M11 20V12h8" stroke="var(--cyan)" strokeWidth="1.3" strokeLinecap="square" opacity="0.7" />
        <path d="M53 20V12h-8" stroke="var(--magenta)" strokeWidth="1.3" strokeLinecap="square" opacity="0.7" />
        <path d="M11 44v8h8" stroke="var(--cyan)" strokeWidth="1.3" strokeLinecap="square" opacity="0.42" />
        <path d="M53 44v8h-8" stroke="var(--magenta)" strokeWidth="1.3" strokeLinecap="square" opacity="0.42" />
        <circle className="brand-mark-pip brand-mark-pip-a" cx="24.5" cy="12.1" r="1.3" fill="var(--cyan)" />
        <circle className="brand-mark-pip brand-mark-pip-b" cx="39.5" cy="12.1" r="1.3" fill="var(--magenta)" />
        <path d={MARK_M} filter={`url(#${bloom})`} fill={`url(#${letter})`} />
        <circle cx="32" cy="47.2" r="1.85" fill="var(--amber-hot)" />
      </svg>
    </span>
  );
}

export function Header() {
  const location = useLocation();
  const mixerMode = isMixerRoute(location.pathname);
  const { shell, openFromDock } = useRadioFmUi();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [identity, setIdentity] = useState<string | null>(() => sessionIdentityName());

  useEffect(() => {
    const syncScrolled = () => {
      setScrolled(window.scrollY > SCROLL_ACTIVATE_PX);
    };

    syncScrolled();
    window.addEventListener("scroll", syncScrolled, { passive: true });
    return () => window.removeEventListener("scroll", syncScrolled);
  }, []);

  useEffect(() => {
    setIdentity(sessionIdentityName());
  }, [location.pathname]);

  useEffect(() => onDjSessionChange(() => setIdentity(sessionIdentityName())), []);

  return (
    <header className={scrolled ? "site-header is-scrolled" : "site-header"}>
      <div className="header-inner">
        <NavLink to="/" className="brand" aria-label="MAMUTE PlayerDJ">
          <BrandMark />
          <span className="brand-lockup">
            <span className="brand-name">Mamute</span>
            <span className="brand-product">PlayerDJ</span>
          </span>
        </NavLink>
        <nav id="site-nav" className={open ? "nav open" : "nav"} aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            className="nav-area-dj"
            to={AREA_DJ_LINK.to}
            onClick={() => setOpen(false)}
          >
            {AREA_DJ_LINK.label}
          </NavLink>
        </nav>
        <div className="header-cta">
          {mixerMode ? <MixerHeaderMidi /> : null}
          <NavLink className="btn header-area-dj" to={AREA_DJ_LINK.to} onClick={() => setOpen(false)}>
            {AREA_DJ_LINK.label}
          </NavLink>
          {shell === "docked" ? (
            <button
              type="button"
              className="btn radio-fm-header-fab"
              onClick={openFromDock}
              aria-label="Ligar Mamute FM"
              title="Ligar rádio"
            >
              <RadioFmEjectIcon />
            </button>
          ) : null}
          {identity ? (
            <NavLink
              className="btn btn-solid header-identity"
              to="/dj"
              title={`Área do DJ · ${identity}`}
              onClick={() => setOpen(false)}
            >
              {identity}
            </NavLink>
          ) : (
            <NavLink className="btn btn-solid" to="/cadastro">
              Cadastrar DJ
            </NavLink>
          )}
        </div>
        <button
          className={open ? "menu-toggle is-open" : "menu-toggle"}
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label="Menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="menu-toggle-icon" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
