import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { PLAN_NAMES, isPlanId } from "../../data/plans";
import { completionRatio, hydrateAcademyProgress, loadProgress } from "../../lib/academy";
import { hydrateProfileFromServer, profileMatchesSession, type DjSession } from "../../lib/dj-auth";
import {
  HARDWARE_LABELS,
  SOCIAL_FIELDS,
  artistInitials,
  experienceLabel,
  formatBirthDate,
  hasText,
  socialHref,
  travelLabel,
  venueLabel,
} from "../../lib/dj-profile-view";
import { loadProfile, loadSelectedPlan } from "../../lib/storage";
import type { DjProfile } from "../../types";

const PORTAL_LINKS = [
  { to: "/mixer", label: "Mixer CDJ", hint: "Dual deck e cabine virtual" },
  { to: "/academia", label: "Academia", hint: "Trilha do primeiro beat" },
  { to: "/catalogo", label: "Plataformas", hint: "Catálogo e limites oficiais" },
  { to: "/download", label: "Download", hint: "Windows, macOS, Linux, Android e iOS" },
  { to: "/cadastro?editar=1", label: "Atualizar mural", hint: "Editar perfil de cabine" },
] as const;

type DjPortalProps = {
  session: DjSession;
  onLogout: () => void;
};

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value || !hasText(value)) return null;
  return (
    <div className="dj-profile-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="dj-profile-chips">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ProfileBlock({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <article className="dj-profile-block">
      <h3>{title}</h3>
      {empty ? <p className="dj-profile-empty">Ainda não preenchido neste visor.</p> : children}
    </article>
  );
}

export function DjPortal({ session, onLogout }: DjPortalProps) {
  const [profile, setProfile] = useState<DjProfile>(() => loadProfile());
  const [plan, setPlan] = useState<string | null>(() => loadSelectedPlan());
  const [done, setDone] = useState<string[]>(() => loadProgress());

  useEffect(() => {
    document.title = "Área do DJ · portal da cabine — MIXORAPlayerDJ";
    void hydrateProfileFromServer().then((remote) => {
      if (remote) {
        setProfile(remote);
        setPlan(loadSelectedPlan());
      }
    });
    void hydrateAcademyProgress().then((merged) => {
      if (merged) setDone(merged);
    });
  }, []);

  const displayName = profileMatchesSession(session)
    ? profile.artistName.trim() || session.artistName
    : session.artistName;
  const displayFullName = profileMatchesSession(session) ? profile.fullName : "";
  const cityLine = [profile.city, profile.country].filter(hasText).join(" · ");
  const academyPercent = Math.round(completionRatio(done) * 100);
  const planName = plan && isPlanId(plan) ? PLAN_NAMES[plan] : null;
  const hardware = profile.hardware.map((item) => HARDWARE_LABELS[item]);
  const socials = SOCIAL_FIELDS.map((field) => {
    const value = profile[field.key];
    if (!hasText(value)) return null;
    return { ...field, value, href: socialHref(field.key, value) };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const identityFilled =
    hasText(profile.fullName) ||
    hasText(profile.pronouns) ||
    hasText(profile.birthDate) ||
    hasText(profile.nationality) ||
    hasText(profile.languages) ||
    hasText(cityLine);
  const contactFilled =
    hasText(profile.email) ||
    hasText(profile.phone) ||
    hasText(profile.whatsapp) ||
    hasText(profile.website);
  const soundFilled =
    hasText(profile.bio) ||
    profile.genres.length > 0 ||
    hasText(profile.influences) ||
    hasText(profile.yearsDJing) ||
    hasText(profile.setsPerMonth);
  const gearFilled =
    hardware.length > 0 ||
    profile.software.length > 0 ||
    hasText(profile.brands) ||
    hasText(profile.headphones);
  const careerFilled =
    hasText(profile.agencies) ||
    hasText(profile.labels) ||
    hasText(profile.residencies) ||
    hasText(profile.travel) ||
    hasText(profile.feeRange) ||
    hasText(profile.pressKit);
  const learningFilled =
    hasText(profile.goals) ||
    hasText(profile.challenges) ||
    hasText(profile.weeklyHours) ||
    profile.mentorship;

  return (
    <div className="page dj-page">
      <header className="dj-page-intro">
        <p className="kicker">Área do DJ</p>
        <h1>Portal da cabine</h1>
        <p className="lede">
          Mural de <strong>{displayName}</strong> — o perfil completo da cabine, como numa rede da
          pista.
        </p>
      </header>

      <section className="dj-portal" aria-labelledby="dj-portal-profile">
        <div className="dj-profile-cover" aria-hidden="true" />

        <header className="dj-profile-hero">
          <div className="dj-profile-avatar" aria-hidden="true">
            {artistInitials(displayName)}
          </div>
          <div className="dj-profile-hero-copy">
            <p className="dj-portal-eyebrow">Perfil ativo</p>
            <h2 id="dj-portal-profile">{displayName}</h2>
            <p>{displayFullName || session.email}</p>
            {cityLine ? <p className="dj-portal-meta">{cityLine}</p> : null}
            {profile.pronouns.trim() ? (
              <p className="dj-portal-meta">{profile.pronouns}</p>
            ) : null}
          </div>
          <div className="dj-profile-hero-actions">
            <Link className="btn" to="/cadastro?editar=1">
              Editar mural
            </Link>
            <button className="btn" type="button" onClick={onLogout}>
              Sair
            </button>
          </div>
        </header>

        {hasText(profile.bio) ? <p className="dj-profile-bio">{profile.bio}</p> : null}

        <ul className="dj-profile-stats" aria-label="Números da cabine">
          <li>
            <strong>{experienceLabel(profile.experienceLevel)}</strong>
            <span>Nível</span>
          </li>
          <li>
            <strong>{profile.yearsDJing.trim() || "0"}</strong>
            <span>Anos de cabine</span>
          </li>
          <li>
            <strong>{profile.setsPerMonth.trim() || "0"}</strong>
            <span>Sets / mês</span>
          </li>
          <li>
            <strong>{academyPercent}%</strong>
            <span>Academia</span>
          </li>
          {planName ? (
            <li>
              <strong>{planName}</strong>
              <span>Combo</span>
            </li>
          ) : null}
        </ul>

        {socials.length > 0 ? (
          <nav className="dj-profile-socials" aria-label="Redes do DJ">
            {socials.map((item) =>
              item.href ? (
                <a key={item.key} href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                <span key={item.key}>
                  {item.label}: {item.value}
                </span>
              ),
            )}
          </nav>
        ) : null}

        <div className="dj-profile-feed">
          <ProfileBlock title="Identidade" empty={!identityFilled}>
            <dl className="dj-profile-facts">
              <Fact label="Nome completo" value={profile.fullName} />
              <Fact label="Nome artístico" value={profile.artistName} />
              <Fact label="Pronomes" value={profile.pronouns} />
              <Fact label="Nascimento" value={formatBirthDate(profile.birthDate)} />
              <Fact label="Nacionalidade" value={profile.nationality} />
              <Fact label="Cidade" value={profile.city} />
              <Fact label="País" value={profile.country} />
              <Fact label="Idiomas" value={profile.languages} />
            </dl>
          </ProfileBlock>

          <ProfileBlock title="Contato" empty={!contactFilled}>
            <dl className="dj-profile-facts">
              <Fact label="E-mail" value={profile.email} />
              <Fact label="Telefone" value={profile.phone} />
              <Fact label="WhatsApp" value={profile.whatsapp} />
              <Fact label="Site / press kit" value={profile.website} />
            </dl>
          </ProfileBlock>

          <ProfileBlock title="Som" empty={!soundFilled}>
            <dl className="dj-profile-facts">
              <Fact label="Nível" value={experienceLabel(profile.experienceLevel)} />
              <Fact label="Anos de cabine" value={profile.yearsDJing} />
              <Fact label="Sets por mês" value={profile.setsPerMonth} />
              <Fact label="Venue" value={venueLabel(profile.preferredVenue)} />
              <Fact label="Influências" value={profile.influences} />
            </dl>
            <ChipList items={profile.genres} />
          </ProfileBlock>

          <ProfileBlock title="Equipamento" empty={!gearFilled}>
            <ChipList items={hardware} />
            <dl className="dj-profile-facts">
              <Fact label="Marcas" value={profile.brands} />
              <Fact label="Fones" value={profile.headphones} />
            </dl>
            <ChipList items={profile.software} />
          </ProfileBlock>

          <ProfileBlock title="Carreira" empty={!careerFilled}>
            <dl className="dj-profile-facts">
              <Fact label="Agências" value={profile.agencies} />
              <Fact label="Selos" value={profile.labels} />
              <Fact label="Residências" value={profile.residencies} />
              <Fact label="Viagem" value={travelLabel(profile.travel)} />
              <Fact label="Cachê" value={profile.feeRange} />
              <Fact label="Press kit" value={profile.pressKit} />
            </dl>
          </ProfileBlock>

          <ProfileBlock title="Aprendizado" empty={!learningFilled}>
            <dl className="dj-profile-facts">
              <Fact label="Horas por semana" value={profile.weeklyHours} />
              <Fact label="Objetivos" value={profile.goals} />
              <Fact label="Desafios" value={profile.challenges} />
              <Fact label="Mentoria" value={profile.mentorship ? "Quero mentoria MIXORA" : null} />
            </dl>
          </ProfileBlock>
        </div>

        <nav className="dj-portal-grid" aria-label="Módulos do portal">
          {PORTAL_LINKS.map((link) => (
            <Link key={link.to} className="dj-portal-tile" to={link.to}>
              <strong>{link.label}</strong>
              <span>{link.hint}</span>
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
