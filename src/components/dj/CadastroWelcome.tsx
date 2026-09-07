import { Link } from "react-router";

type CadastroWelcomeProps = {
  artistName: string;
  email: string;
  emailVerificationRequired: boolean;
  emailSent: boolean;
  localCode?: string;
};

export function CadastroWelcome({
  artistName,
  email,
  emailVerificationRequired,
  emailSent,
  localCode,
}: CadastroWelcomeProps) {
  const displayName = artistName.trim() || "DJ";
  const confirmQuery = new URLSearchParams({ email });
  if (emailSent) confirmQuery.set("enviado", "1");

  return (
    <section className="dj-register-welcome" aria-labelledby="cadastro-welcome-title" aria-live="polite">
      <p className="dj-register-welcome-kicker">Etapa final · cabine pronta</p>
      <p className="dj-register-welcome-badge" aria-hidden="true">
        08/08
      </p>
      <h2 id="cadastro-welcome-title">Parabéns, {displayName}!</h2>
      <p className="dj-register-welcome-lede">
        Seja bem-vindo. Você concluiu todas as etapas do cadastro MIXORAPlayerDJ.
      </p>
      <p className="dj-register-welcome-copy">
        A cabine de <strong>{displayName}</strong> está no visor — identidade, contato, som e termos
        gravados. O portal, o mixer e a academia já reconhecem o seu mural.
      </p>
      {emailVerificationRequired ? (
        <p className="form-status dj-register-welcome-status" role="status">
          {emailSent
            ? `Enviamos a confirmação para ${email}. Confirme o e-mail para liberar o login.`
            : localCode
              ? `Cadastro gravado no servidor. E-mail de envio ainda não está configurado — use o código ${localCode} na Área do DJ.`
              : `Confirme ${email} pelo código ou pelo link para entrar na Área do DJ.`}
        </p>
      ) : (
        <p className="form-status dj-register-welcome-status" role="status">
          Perfil salvo no visor MIXORA. Entre na Área do DJ com o e-mail e a senha que você definiu.
        </p>
      )}
      <div className="dj-register-welcome-actions">
        {emailVerificationRequired ? (
          <Link
            className="btn btn-solid"
            to={`/cadastro/confirmar-email?${confirmQuery.toString()}`}
          >
            Confirmar e-mail
          </Link>
        ) : (
          <Link className="btn btn-solid" to={`/dj?cadastrado=1&email=${encodeURIComponent(email)}`}>
            Entrar na Área do DJ
          </Link>
        )}
        {!emailVerificationRequired ? (
          <Link className="btn" to="/mixer">
            Abrir o mixer
          </Link>
        ) : (
          <Link className="btn" to={`/dj?cadastrado=1&email=${encodeURIComponent(email)}`}>
            Ir para login
          </Link>
        )}
      </div>
    </section>
  );
}
