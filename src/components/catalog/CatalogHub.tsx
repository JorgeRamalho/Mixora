import { NavLink } from "react-router";
import { PLATFORMS } from "../../data/platforms";

export function CatalogHub() {
  return (
    <div className="platform-stack">
      {PLATFORMS.map((platform) => (
        <article className="card platform-card" key={platform.id} id={platform.id}>
          <header>
            <h2>
              <span className="dot" style={{ background: platform.accent }} /> {platform.name}
            </h2>
            <p className="kicker">{platform.role}</p>
          </header>
          <p>{platform.summary}</p>
          <h3>O que entra no MIXORAPlayerDJ</h3>
          <ul>
            {platform.capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3>Limites legais e técnicos</h3>
          <ul>
            {platform.limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{platform.playerDjUse}</p>
          <p>
            {platform.docsUrl.startsWith("/") ? (
              <NavLink className="btn" to={platform.docsUrl}>
                Abrir no MIXORA
              </NavLink>
            ) : (
              <a className="btn" href={platform.docsUrl} target="_blank" rel="noreferrer">
                Documentação
              </a>
            )}
            {platform.partnerUrl ? (
              <a className="btn" href={platform.partnerUrl} target="_blank" rel="noreferrer">
                Streaming / partner
              </a>
            ) : null}
          </p>
        </article>
      ))}
    </div>
  );
}
