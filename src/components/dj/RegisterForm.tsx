import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useNavigate, useSearchParams } from "react-router";
import { GENRE_OPTIONS, SOFTWARE_OPTIONS } from "../../data/academy";
import {
  CADASTRO_STEP_COUNT,
  CADASTRO_STEPS,
  cadastroJourneyProgress,
  type CadastroStepNumber,
} from "../../data/cadastro-journey";
import { PasswordField } from "../forms/PasswordField";
import { CadastroWelcome } from "./CadastroWelcome";
import { isCadastroEditMode } from "../../lib/cadastro-mode";
import { pingDjApi } from "../../lib/dj-api";
import {
  hasCredentials,
  hydrateProfileFromServer,
  MIN_PASSWORD_LENGTH,
  registerDjProfile,
} from "../../lib/dj-auth";
import { HARDWARE_LABELS } from "../../lib/dj-profile-view";
import { BLANK_CADASTRO_PROFILE, isExperience, loadProfile } from "../../lib/storage";
import type { DjProfile, HardwareKind } from "../../types";

const HARDWARE: HardwareKind[] = ["cdj", "controladora", "mixer", "toca-discos"];

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "@seuartista" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "soundcloud.com/…" },
  { key: "mixcloud", label: "Mixcloud", placeholder: "mixcloud.com/…" },
  { key: "beatport", label: "Beatport", placeholder: "beatport.com/artist/…" },
  { key: "spotify", label: "Spotify", placeholder: "open.spotify.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@…" },
  { key: "tiktok", label: "TikTok", placeholder: "@seuartista" },
  { key: "deezer", label: "Deezer", placeholder: "deezer.com/…" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    DjProfile,
    "instagram" | "soundcloud" | "mixcloud" | "beatport" | "spotify" | "youtube" | "tiktok" | "deezer"
  >;
  label: string;
  placeholder: string;
}>;

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function isStepDone(profile: DjProfile, step: CadastroStepNumber, passwordReady: boolean): boolean {
  switch (step) {
    case 1:
      return Boolean(
        profile.fullName.trim() && profile.artistName.trim() && profile.city.trim() && profile.country.trim(),
      );
    case 2:
      return Boolean(profile.email.trim()) && passwordReady;
    case 3:
      return Boolean(profile.bio.trim() && profile.genres.length > 0);
    case 4:
      return profile.hardware.length > 0;
    case 5:
      return SOCIAL_FIELDS.some(({ key }) => profile[key].trim());
    case 6:
      return Boolean(
        profile.agencies.trim() ||
          profile.labels.trim() ||
          profile.residencies.trim() ||
          profile.feeRange.trim() ||
          profile.pressKit.trim(),
      );
    case 7:
      return Boolean(profile.weeklyHours.trim() || profile.goals.trim() || profile.challenges.trim());
    case 8:
      return profile.over18 && profile.terms;
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

function stepGateError(
  profile: DjProfile,
  step: CadastroStepNumber,
  password: string,
  passwordConfirm: string,
  alreadyHasPassword: boolean,
): string | null {
  switch (step) {
    case 1:
      if (!profile.fullName.trim()) return "Informe o nome completo para seguir.";
      if (!profile.artistName.trim()) return "Informe o nome artístico para seguir.";
      if (!profile.city.trim()) return "Informe a cidade para seguir.";
      return null;
    case 2:
      if (!profile.email.trim()) return "Informe o e-mail para seguir.";
      if (!alreadyHasPassword || password) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
        }
        if (password !== passwordConfirm) return "A confirmação da senha não confere.";
      }
      return null;
    case 3:
      if (!profile.bio.trim()) return "Escreva a bio para seguir.";
      return null;
    case 4:
    case 5:
    case 6:
    case 7:
      return null;
    case 8:
      if (!profile.over18) return "Confirme que tem 18 anos ou mais.";
      if (!profile.terms) return "Aceite os termos de uso para concluir o cadastro.";
      return null;
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

function SectionHead({
  step,
  title,
  hint,
  headingRef,
}: {
  step: CadastroStepNumber;
  title: string;
  hint: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header className="dj-register-section-head">
      <span className="dj-register-section-badge" aria-hidden>
        {String(step).padStart(2, "0")}
      </span>
      <div>
        <h2 ref={headingRef} id={`dj-step-title-${step}`} tabIndex={-1}>
          {step}. {title}
        </h2>
        <p>{hint}</p>
      </div>
    </header>
  );
}

function FieldLabel({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className ? `field ${className}` : "field"}>
      {label}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

type WelcomeState = {
  artistName: string;
  email: string;
  emailVerificationRequired: boolean;
  emailSent: boolean;
  localCode?: string;
};

type RegisterFormProps = {
  selectedPlan?: string | null;
  onJourneyComplete?: () => void;
};

export function RegisterForm({ selectedPlan = null, onJourneyComplete }: RegisterFormProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = isCadastroEditMode(params);
  const alreadyHasPassword = editing && hasCredentials();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [profile, setProfile] = useState<DjProfile>(() =>
    editing ? loadProfile() : { ...BLANK_CADASTRO_PROFILE },
  );
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [currentStep, setCurrentStep] = useState<CadastroStepNumber>(1);
  const [farthest, setFarthest] = useState<CadastroStepNumber>(editing ? CADASTRO_STEP_COUNT : 1);
  const [welcome, setWelcome] = useState<WelcomeState | null>(null);
  const [apiHint, setApiHint] = useState("");

  useEffect(() => {
    if (currentStep !== 8 || welcome) {
      setApiHint("");
      return;
    }
    let cancelled = false;
    void pingDjApi().then((ok) => {
      if (cancelled) return;
      setApiHint(
        ok
          ? ""
          : "A API local não respondeu. Deixe npm run dev no ar (http://localhost:8888) e clique de novo — pode continuar neste mesmo endereço.",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [currentStep, welcome]);

  useEffect(() => {
    if (!editing) return;
    void hydrateProfileFromServer().then((remote) => {
      if (remote) setProfile(remote);
    });
  }, [editing]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    document.getElementById(`dj-section-${currentStep}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [currentStep]);

  const passwordReady =
    alreadyHasPassword && !password
      ? true
      : password.length >= MIN_PASSWORD_LENGTH && password === passwordConfirm;

  const progress = useMemo(
    () => cadastroJourneyProgress(currentStep, Boolean(welcome)),
    [currentStep, welcome],
  );
  const activeMeta = CADASTRO_STEPS.find((item) => item.step === currentStep);

  const update = <K extends keyof DjProfile>(key: K, value: DjProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const goToStep = (step: CadastroStepNumber) => {
    if (!editing && step > farthest) return;
    setAuthError("");
    setCurrentStep(step);
  };

  const goNext = () => {
    const gate = stepGateError(profile, currentStep, password, passwordConfirm, alreadyHasPassword);
    if (gate) {
      setAuthError(gate);
      return false;
    }
    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return false;
    }
    setAuthError("");
    if (currentStep >= CADASTRO_STEP_COUNT) return true;
    const next = (currentStep + 1) as CadastroStepNumber;
    setCurrentStep(next);
    setFarthest((current) => (next > current ? next : current));
    return true;
  };

  const goBack = () => {
    if (currentStep <= 1) return;
    setAuthError("");
    setCurrentStep((currentStep - 1) as CadastroStepNumber);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing && currentStep !== CADASTRO_STEP_COUNT) {
      goNext();
      return;
    }

    setAuthError("");
    const gate = stepGateError(profile, 8, password, passwordConfirm, alreadyHasPassword);
    if (gate) {
      setAuthError(gate);
      setCurrentStep(8);
      return;
    }
    if (!alreadyHasPassword || password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setAuthError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        setCurrentStep(2);
        return;
      }
      if (password !== passwordConfirm) {
        setAuthError("A confirmação da senha não confere.");
        setCurrentStep(2);
        return;
      }
    }

    const payload: DjProfile = {
      ...profile,
      country: profile.country.trim() || "Brasil",
      languages: profile.languages.trim() || "Português",
    };

    setPending(true);
    const result = await registerDjProfile(payload, password, selectedPlan);
    setPending(false);

    if (!result.ok) {
      setAuthError(result.message);
      return;
    }

    setSaved(true);
    if (!editing) {
      setWelcome({
        artistName: payload.artistName,
        email: payload.email,
        emailVerificationRequired: Boolean(result.emailVerificationRequired),
        emailSent: Boolean(result.emailSent),
        localCode: result.localCode,
      });
      onJourneyComplete?.();
      return;
    }
    navigate("/dj?cadastrado=1");
  };

  if (welcome) {
    return (
      <div className="dj-register">
        <CadastroWelcome
          artistName={welcome.artistName}
          email={welcome.email}
          emailVerificationRequired={welcome.emailVerificationRequired}
          emailSent={welcome.emailSent}
          localCode={welcome.localCode}
        />
      </div>
    );
  }

  return (
    <div className="dj-register">
      <div className="dj-register-hero">
        <div className="dj-register-hero-top">
          <div className="dj-register-hero-copy">
            <h2>Jornada da cabine · {CADASTRO_STEP_COUNT} etapas</h2>
            <p>
              {activeMeta
                ? `Etapa ${currentStep} de ${CADASTRO_STEP_COUNT} — ${activeMeta.title}. ${activeMeta.hint}`
                : "Siga uma etapa por vez até o convite de boas-vindas."}
            </p>
          </div>
          <div className="dj-register-progress-ring" aria-live="polite">
            <span className="dj-register-progress-value">{progress}%</span>
            <span className="dj-register-progress-label">
              Etapa {currentStep} de {CADASTRO_STEP_COUNT}
            </span>
            <div
              className="dj-register-progress-bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da jornada de cadastro"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <nav className="dj-register-steps" aria-label="Etapas do cadastro">
          {CADASTRO_STEPS.map(({ step, short }) => {
            const locked = !editing && step > farthest;
            const current = step === currentStep;
            const done = isStepDone(profile, step, passwordReady);
            return (
              <button
                key={step}
                type="button"
                className={`dj-register-step-pill${done ? " is-done" : ""}${current ? " is-current" : ""}`}
                onClick={() => goToStep(step)}
                disabled={locked}
                aria-current={current ? "step" : undefined}
                aria-disabled={locked}
              >
                {String(step).padStart(2, "0")} · {short}
              </button>
            );
          })}
        </nav>
      </div>

      <form
        ref={formRef}
        className="form-grid dj-register-form"
        name="mamute-cadastro"
        autoComplete="off"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        noValidate={false}
      >
        <input type="hidden" name="form-name" value="mamute-cadastro" />

        {currentStep === 1 ? (
          <section className="form-section" id="dj-section-1" aria-labelledby="dj-step-title-1">
            <SectionHead
              step={1}
              title="Identidade"
              hint="Quem você é fora e dentro da cabine."
              headingRef={headingRef}
            />
            <div className="fields">
              <FieldLabel label="Nome completo" hint="Como consta em documentos e contratos.">
                <input
                  required
                  placeholder="Maria Silva"
                  value={profile.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel label="Nome artístico" hint="Nome que aparece no visor e no mural MIXORA.">
                <input
                  required
                  placeholder="DJ MIXORA"
                  value={profile.artistName}
                  onChange={(e) => update("artistName", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel label="Pronomes" hint="Opcional — ajuda na comunicação inclusiva.">
                <input
                  placeholder="ela/dela, ele/dele…"
                  value={profile.pronouns}
                  onChange={(e) => update("pronouns", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel label="Nascimento" hint="Para verificação de maioridade.">
                <input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => update("birthDate", e.target.value)}
                />
              </FieldLabel>
              <label className="field">
                Nacionalidade
                <input
                  placeholder="Brasileira"
                  value={profile.nationality}
                  onChange={(e) => update("nationality", e.target.value)}
                />
              </label>
              <label className="field">
                Cidade
                <input
                  required
                  placeholder="São Paulo"
                  value={profile.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </label>
              <label className="field">
                País
                <input
                  placeholder="Brasil"
                  value={profile.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </label>
              <FieldLabel label="Idiomas" hint="Separe com vírgula se falar mais de um.">
                <input
                  placeholder="Português, inglês…"
                  value={profile.languages}
                  onChange={(e) => update("languages", e.target.value)}
                />
              </FieldLabel>
            </div>
          </section>
        ) : null}

        {currentStep === 2 ? (
          <section className="form-section" id="dj-section-2" aria-labelledby="dj-step-title-2">
            <SectionHead
              step={2}
              title="Contato"
              hint="Canal direto para booking e mentoria."
              headingRef={headingRef}
            />
            <div className="fields">
              <FieldLabel label="E-mail" hint="Usado para login e confirmações.">
                <input
                  type="email"
                  required
                  placeholder="voce@email.com"
                  value={profile.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </FieldLabel>
              <label className="field">
                Telefone
                <input
                  placeholder="+55 11 99999-0000"
                  value={profile.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </label>
              <FieldLabel label="WhatsApp" hint="Preferido para contato rápido de promoters.">
                <input
                  placeholder="+55 11 99999-0000"
                  value={profile.whatsapp}
                  onChange={(e) => update("whatsapp", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel label="Site / press kit" hint="Link do site, Linktree ou press kit online.">
                <input
                  placeholder="https://…"
                  value={profile.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel
                label="Senha"
                hint={
                  alreadyHasPassword
                    ? "Deixe em branco para manter a senha atual, ou defina uma nova."
                    : "Usada só para entrar na Área do DJ. Mínimo de 8 caracteres."
                }
              >
                <PasswordField
                  name="password"
                  aria-label="Senha"
                  autoComplete="new-password"
                  required={!alreadyHasPassword}
                  minLength={alreadyHasPassword ? undefined : MIN_PASSWORD_LENGTH}
                  placeholder={alreadyHasPassword ? "Nova senha (opcional)" : "Mínimo 8 caracteres"}
                  value={password}
                  onChange={setPassword}
                />
              </FieldLabel>
              <FieldLabel label="Confirmar senha" hint="Repita a senha para evitar erro de digitação.">
                <PasswordField
                  name="passwordConfirm"
                  aria-label="Confirmar senha"
                  autoComplete="new-password"
                  required={!alreadyHasPassword || Boolean(password)}
                  minLength={password ? MIN_PASSWORD_LENGTH : undefined}
                  placeholder="Repita a senha"
                  value={passwordConfirm}
                  onChange={setPasswordConfirm}
                />
              </FieldLabel>
            </div>
          </section>
        ) : null}

        {currentStep === 3 ? (
          <section className="form-section" id="dj-section-3" aria-labelledby="dj-step-title-3">
            <SectionHead
              step={3}
              title="Perfil artístico"
              hint="Gêneros, nível e a história do seu som."
              headingRef={headingRef}
            />
            <div className="fields">
              <FieldLabel label="Nível" hint="A academia adapta exercícios ao seu nível.">
                <select
                  value={profile.experienceLevel}
                  onChange={(e) => {
                    if (isExperience(e.target.value)) update("experienceLevel", e.target.value);
                  }}
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                  <option value="profissional">Profissional</option>
                </select>
              </FieldLabel>
              <label className="field">
                Anos de cabine
                <input
                  type="number"
                  min={0}
                  placeholder="3"
                  value={profile.yearsDJing}
                  onChange={(e) => update("yearsDJing", e.target.value)}
                />
              </label>
              <label className="field">
                Sets por mês
                <input
                  type="number"
                  min={0}
                  placeholder="4"
                  value={profile.setsPerMonth}
                  onChange={(e) => update("setsPerMonth", e.target.value)}
                />
              </label>
              <FieldLabel label="Venue preferida" hint="Onde você mais se sente em casa.">
                <select value={profile.preferredVenue} onChange={(e) => update("preferredVenue", e.target.value)}>
                  <option value="clube">Clube</option>
                  <option value="festival">Festival</option>
                  <option value="radio">Rádio</option>
                  <option value="streaming">Live stream</option>
                  <option value="casamento">Open format / festa</option>
                </select>
              </FieldLabel>
              <FieldLabel className="full" label="Bio" hint="Até 800 caracteres — conte seu estilo em poucas linhas.">
                <textarea
                  required
                  maxLength={800}
                  placeholder="House e techno com grooves brasileiros, sets energéticos para pista cheia…"
                  value={profile.bio}
                  onChange={(e) => update("bio", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel className="full" label="Influências" hint="Artistas ou referências que moldam seu som.">
                <input
                  placeholder="Frankie Knuckles, MK, Vintage Culture…"
                  value={profile.influences}
                  onChange={(e) => update("influences", e.target.value)}
                />
              </FieldLabel>
              <div className="field full">
                Gêneros
                <span className="field-hint">Selecione um ou mais — aparecem no visor e nas sugestões de playlist.</span>
                <div className="chip-set">
                  {GENRE_OPTIONS.map((genre) => (
                    <label key={genre}>
                      <input
                        type="checkbox"
                        checked={profile.genres.includes(genre)}
                        onChange={() => update("genres", toggle(profile.genres, genre))}
                      />
                      {genre}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {currentStep === 4 ? (
          <section className="form-section" id="dj-section-4" aria-labelledby="dj-step-title-4">
            <SectionHead
              step={4}
              title="Equipamento"
              hint="CDJ, controladora, mixer ou vinil — o MIXORAPlayerDJ simula os três primeiros."
              headingRef={headingRef}
            />
            <p className="dj-register-optional">Opcional — pode completar depois no mural da Área do DJ.</p>
            <div className="fields">
              <div className="field full">
                Hardware
                <span className="field-hint">Marque o que você usa ou quer treinar na cabine virtual.</span>
                <div className="chip-set">
                  {HARDWARE.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={profile.hardware.includes(item)}
                        onChange={() => update("hardware", toggle(profile.hardware, item))}
                      />
                      {HARDWARE_LABELS[item]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="field">
                Marcas
                <input
                  value={profile.brands}
                  placeholder="Pioneer, Denon, NI…"
                  onChange={(e) => update("brands", e.target.value)}
                />
              </label>
              <label className="field">
                Fones
                <input
                  placeholder="Sennheiser HD-25…"
                  value={profile.headphones}
                  onChange={(e) => update("headphones", e.target.value)}
                />
              </label>
              <div className="field full">
                Software
                <span className="field-hint">DJs que usam o mesmo software recebem dicas mais precisas.</span>
                <div className="chip-set">
                  {SOFTWARE_OPTIONS.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={profile.software.includes(item)}
                        onChange={() => update("software", toggle(profile.software, item))}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {currentStep === 5 ? (
          <section className="form-section" id="dj-section-5" aria-labelledby="dj-step-title-5">
            <SectionHead
              step={5}
              title="Presença digital"
              hint="Handles do MIXORA e das cinco integrações do visor — preencha os que você usa."
              headingRef={headingRef}
            />
            <p className="dj-register-optional">Opcional — pode completar depois no mural da Área do DJ.</p>
            <div className="fields">
              {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    placeholder={placeholder}
                    value={profile[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {currentStep === 6 ? (
          <section className="form-section" id="dj-section-6" aria-labelledby="dj-step-title-6">
            <SectionHead
              step={6}
              title="Carreira"
              hint="Booking, selos e disponibilidade para gigs."
              headingRef={headingRef}
            />
            <p className="dj-register-optional">Opcional — pode completar depois no mural da Área do DJ.</p>
            <div className="fields">
              <label className="field">
                Agências
                <input
                  placeholder="Nome da agência ou autônomo"
                  value={profile.agencies}
                  onChange={(e) => update("agencies", e.target.value)}
                />
              </label>
              <label className="field">
                Selos
                <input
                  placeholder="Selos com os quais já lançou"
                  value={profile.labels}
                  onChange={(e) => update("labels", e.target.value)}
                />
              </label>
              <label className="field">
                Residências
                <input
                  placeholder="Clube X — sextas mensais"
                  value={profile.residencies}
                  onChange={(e) => update("residencies", e.target.value)}
                />
              </label>
              <label className="field">
                Viagem
                <select value={profile.travel} onChange={(e) => update("travel", e.target.value)}>
                  <option value="local">Só local</option>
                  <option value="nacional">Nacional</option>
                  <option value="internacional">Internacional</option>
                </select>
              </label>
              <FieldLabel label="Cache" hint="Faixa indicativa — opcional e confidencial.">
                <input
                  placeholder="R$ 1.500 – 3.000 / set"
                  value={profile.feeRange}
                  onChange={(e) => update("feeRange", e.target.value)}
                />
              </FieldLabel>
              <label className="field">
                Press kit URL
                <input
                  placeholder="https://…"
                  value={profile.pressKit}
                  onChange={(e) => update("pressKit", e.target.value)}
                />
              </label>
            </div>
          </section>
        ) : null}

        {currentStep === 7 ? (
          <section className="form-section" id="dj-section-7" aria-labelledby="dj-step-title-7">
            <SectionHead
              step={7}
              title="Aprendizado"
              hint="A academia usa isso para sugerir módulos e exercícios."
              headingRef={headingRef}
            />
            <p className="dj-register-optional">Opcional — pode completar depois no mural da Área do DJ.</p>
            <div className="fields">
              <FieldLabel label="Horas por semana" hint="Quanto tempo você pode dedicar por semana.">
                <input
                  type="number"
                  min={1}
                  max={40}
                  placeholder="5"
                  value={profile.weeklyHours}
                  onChange={(e) => update("weeklyHours", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel className="full" label="Objetivos" hint="Ex.: transições mais limpas, beatmatch em vinil, branding.">
                <textarea
                  placeholder="Quero dominar harmonic mixing e gravar um podcast mensal…"
                  value={profile.goals}
                  onChange={(e) => update("goals", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel className="full" label="Desafios atuais" hint="O que mais trava você hoje na cabine.">
                <textarea
                  placeholder="Dificuldade com EQ em pista barulhenta…"
                  value={profile.challenges}
                  onChange={(e) => update("challenges", e.target.value)}
                />
              </FieldLabel>
              <label className="field">
                <span>
                  <input
                    type="checkbox"
                    checked={profile.mentorship}
                    onChange={(e) => update("mentorship", e.target.checked)}
                  />
                  Quero mentoria MIXORA
                </span>
              </label>
            </div>
          </section>
        ) : null}

        {currentStep === 8 ? (
          <section className="form-section" id="dj-section-8" aria-labelledby="dj-step-title-8">
            <SectionHead
              step={8}
              title="Termos"
              hint="Cadastro pedagógico. Mixagem licenciada continua nas plataformas oficiais."
              headingRef={headingRef}
            />
            <ul className="dj-register-recap" aria-label="Resumo das etapas anteriores">
              {CADASTRO_STEPS.slice(0, -1).map(({ step, title }) => (
                <li key={step} className={isStepDone(profile, step, passwordReady) ? "is-done" : ""}>
                  <span>{String(step).padStart(2, "0")}</span>
                  {title}
                  {step === 1 && profile.artistName.trim() ? ` · ${profile.artistName}` : ""}
                  {step === 2 && profile.email.trim() ? ` · ${profile.email}` : ""}
                </li>
              ))}
            </ul>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  required
                  checked={profile.over18}
                  onChange={(e) => update("over18", e.target.checked)}
                />
                Tenho 18 anos ou mais
              </label>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={profile.terms}
                  onChange={(e) => update("terms", e.target.checked)}
                />
                Aceito os termos de uso e a política de catálogos (sem mixar streams proibidos)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={profile.imageRights}
                  onChange={(e) => update("imageRights", e.target.checked)}
                />
                Autorizo uso de nome artístico no mural MIXORA
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={profile.newsletter}
                  onChange={(e) => update("newsletter", e.target.checked)}
                />
                Quero avisos de aulas e eventos
              </label>
            </div>
          </section>
        ) : null}

        <footer className="dj-register-footer">
          <p>
            {currentStep === 8
              ? "Ao concluir, o perfil é salvo no banco MIXORA e espelhado neste navegador. Revise nome artístico, e-mail e senha antes de confirmar."
              : "Uma etapa por vez. Você pode voltar às anteriores; as próximas só abrem depois de concluir esta."}
          </p>
          {authError ? (
            <p className="dj-login-error" role="alert">
              {authError}
            </p>
          ) : apiHint ? (
            <p className="dj-login-error" role="alert">
              {apiHint}
            </p>
          ) : null}
          <div className="dj-register-nav">
            {currentStep > 1 ? (
              <button className="btn" type="button" onClick={goBack}>
                Voltar
              </button>
            ) : null}
            <p className="dj-register-nav-meta">
              Etapa {currentStep} de {CADASTRO_STEP_COUNT}
            </p>
            <div className="dj-register-nav-actions">
              {currentStep < CADASTRO_STEP_COUNT ? (
                <button className="btn btn-solid" type="button" onClick={goNext}>
                  Continuar
                </button>
              ) : (
                <button className="btn btn-solid" type="submit" disabled={pending}>
                  {pending ? "Gravando…" : editing ? "Gravar perfil de cabine" : "Concluir cadastro"}
                </button>
              )}
              {editing && currentStep < CADASTRO_STEP_COUNT ? (
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? "Gravando…" : "Gravar perfil de cabine"}
                </button>
              ) : null}
            </div>
          </div>
          {saved ? (
            <p className="form-status" role="status">
              Perfil salvo no visor MIXORA.
            </p>
          ) : null}
        </footer>
      </form>
    </div>
  );
}
