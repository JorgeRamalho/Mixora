import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { PasswordField } from "../components/forms/PasswordField";
import { confirmEmailWithToken, getLoginEmailPrefill, resendEmailVerification, type LoginResult } from "../lib/dj-auth";

type VerifyState = "pending" | "success" | "error" | "idle";

function resolveConfirmEmail(emailParam: string | null, emailSent: boolean): string {
  return getLoginEmailPrefill({
    emailParam,
    justRegistered: emailSent || Boolean(emailParam?.trim()),
  });
}

export function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const emailParam = params.get("email");
  const emailSent = params.get("enviado") === "1";

  const [verifyState, setVerifyState] = useState<VerifyState>(token ? "pending" : "idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(() => resolveConfirmEmail(emailParam, emailSent));
  const [password, setPassword] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendPending, setResendPending] = useState(false);

  useEffect(() => {
    const fromUrl = emailParam?.trim() ?? "";
    if (fromUrl) {
      setResendEmail(fromUrl);
      return;
    }
    setResendEmail(resolveConfirmEmail(emailParam, emailSent));
  }, [emailParam, emailSent]);

  const loginHref = resendEmail.trim()
    ? `/dj?cadastrado=1&email=${encodeURIComponent(resendEmail.trim())}`
    : "/dj";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timeoutId = 0;

    void confirmEmailWithToken(token).then((result: LoginResult) => {
      if (cancelled) return;
      if (result.ok) {
        setVerifyState("success");
        setVerifyMessage("E-mail confirmado. Redirecionando ao portal…");
        timeoutId = window.setTimeout(() => navigate("/dj"), 1800);
        return;
      }
      setVerifyState("error");
      setVerifyMessage(result.message);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [token, navigate]);

  const showResendForm = !token || verifyState === "idle" || verifyState === "error";

  const onResend = async () => {
    setResendError("");
    setResendMessage("");
    if (!resendEmail.trim() || !password) {
      setResendError("Informe o e-mail cadastrado e a senha para reenviar o código e o link.");
      return;
    }
    setResendPending(true);
    const result = await resendEmailVerification(resendEmail, password);
    setResendPending(false);
    if (!result.ok) {
      setResendError(result.message);
      return;
    }
    setResendMessage(result.message);
  };

  return (
    <div className="page dj-page">
      <header className="dj-page-intro">
        <p className="kicker">Cadastro DJ</p>
        <h1>Confirme seu e-mail</h1>
        <p className="lede">
          A autenticação da Área do DJ exige confirmação do e-mail cadastrado. Abra o link que
          enviamos, use o código de 6 dígitos em Receber código na Área do DJ ou peça um novo envio abaixo.
        </p>
      </header>

      {token ? (
        <section className="dj-login card" aria-live="polite">
          {verifyState === "pending" ? <p className="form-status">Validando link de confirmação…</p> : null}
          {verifyState === "success" ? (
            <p className="form-status dj-login-banner" role="status">{verifyMessage}</p>
          ) : null}
          {verifyState === "error" ? (
            <p className="dj-login-error" role="alert">{verifyMessage}</p>
          ) : null}
        </section>
      ) : null}

      {showResendForm ? (
        <section className="dj-login card" aria-labelledby="confirm-email-title">
          <h2 id="confirm-email-title">Aguardando confirmação</h2>
          {emailSent ? (
            <p className="form-status dj-login-banner" role="status">
              Enviamos um código de verificação e um link de confirmação
              {resendEmail ? ` para ${resendEmail}` : ""}.
              Use um dos dois para liberar o login na Área do DJ.
            </p>
          ) : (
            <p className="lede">
              {resendEmail
                ? `Confirme ${resendEmail} pelo link do e-mail ou peça um novo envio.`
                : "Confirme o e-mail pelo link recebido ou peça um novo envio."}
            </p>
          )}

          <form
            className="dj-login-form"
            autoComplete="off"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="field">
              E-mail cadastrado
              <input
                type="email"
                name="dj-confirm-email"
                autoComplete="off"
                inputMode="email"
                data-lpignore="true"
                data-1p-ignore
                value={resendEmail}
                onChange={(event) => setResendEmail(event.target.value)}
                readOnly={Boolean(emailParam?.trim())}
                placeholder="voce@email.com"
              />
            </label>
            <label className="field">
              Senha
              <PasswordField
                aria-label="Senha"
                autoComplete="current-password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={setPassword}
              />
            </label>
            {resendError ? (
              <p className="dj-login-error" role="alert">{resendError}</p>
            ) : null}
            {resendMessage ? (
              <p className="form-status" role="status">{resendMessage}</p>
            ) : null}
            <button className="btn btn-solid" type="button" disabled={resendPending} onClick={() => void onResend()}>
              {resendPending ? "Reenviando…" : "Reenviar código e link de confirmação"}
            </button>
          </form>
        </section>
      ) : null}

      <p className="dj-page-switch">
        Já confirmou? <Link to={loginHref}>Entrar na Área do DJ</Link>
      </p>
    </div>
  );
}
