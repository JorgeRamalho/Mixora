import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { MixoraMark } from "../brand/MixoraMark";
import { DownloadIcon } from "../download/DownloadIcon";
import { onDjSessionChange, sessionIdentityName } from "../../lib/dj-auth";

const SCROLL_ACTIVATE_PX = 10;

const NAV_LINKS = [
  { to: "/", label: "Início" },
  { to: "/harmonia", label: "Harmonia" },
  { to: "/academia", label: "Sala de Aula" },
  { to: "/mixer", label: "Mixer CDJ" },
  { to: "/catalogo", label: "Plataformas" },
] as const;

const AREA_DJ_LINK = { to: "/dj", label: "Área DJ" } as const;
const DOWNLOAD_LINK = { to: "/download", label: "Download" } as const;

function BrandMark() {
  return (
    <span className="brand-glyph">
      <span className="brand-mark" aria-hidden="true">
        <MixoraMark className="brand-mark-svg" />
      </span>
      <span className="brand-online">
        <span className="brand-online-pip" aria-hidden="true" />
        ONLINE
      </span>
    </span>
  );
}

export function Header() {
  const location = useLocation();
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
        <NavLink to="/" className="brand" aria-label="MIXORAPlayerDJ">
          <BrandMark />
          <span className="brand-lockup">
            <span className="brand-name">MIXORA</span>
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
            className={({ isActive }) => (isActive ? "nav-download active" : "nav-download")}
            to={DOWNLOAD_LINK.to}
            onClick={() => setOpen(false)}
          >
            {DOWNLOAD_LINK.label}
          </NavLink>
          <NavLink
            className="nav-area-dj"
            to={AREA_DJ_LINK.to}
            onClick={() => setOpen(false)}
          >
            {AREA_DJ_LINK.label}
          </NavLink>
        </nav>
        <div className="header-cta">
          <NavLink
            className={({ isActive }) =>
              isActive ? "btn header-download active" : "btn header-download"
            }
            to={DOWNLOAD_LINK.to}
            onClick={() => setOpen(false)}
          >
            <DownloadIcon className="header-download-icon" />
            {DOWNLOAD_LINK.label}
          </NavLink>
          <NavLink className="btn header-area-dj" to={AREA_DJ_LINK.to} onClick={() => setOpen(false)}>
            {AREA_DJ_LINK.label}
          </NavLink>
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
