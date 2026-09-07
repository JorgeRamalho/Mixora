import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { RegisterForm } from "../components/dj/RegisterForm";
import { PLAN_NAMES, isPlanId } from "../data/plans";
import { isCadastroEditMode } from "../lib/cadastro-mode";
import { loadProfile } from "../lib/storage";

export function CadastroPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const editing = isCadastroEditMode(params);
  const profile = editing ? loadProfile() : null;
  const requested = params.get("plano");
  const selectedPlan = isPlanId(requested) ? requested : null;
  const [journeyComplete, setJourneyComplete] = useState(false);

  useEffect(() => {
    if (!editing) {
      setJourneyComplete(false);
    }
  }, [location.key, editing]);

  const registerFormKey = editing ? "edit" : `cadastro-${location.key}`;

  return (
    <div className={journeyComplete ? "page dj-page is-cadastro-complete" : "page dj-page"}>
      {journeyComplete ? null : (
        <header className="dj-page-intro">
          <p className="kicker">Cadastro DJ</p>
          <h1>Cadastro completo de cabine</h1>
          <p className="lede">
            Jornada em oito etapas: identidade, contato, som, equipamento, redes, carreira,
            aprendizado e termos. Siga na ordem até a mensagem de boas-vindas.{" "}
            {profile?.artistName
              ? `Visor atual: ${profile.artistName}.`
              : "Uma etapa por vez — ao concluir, a cabine te recebe no MIXORAPlayerDJ."}
          </p>
          <p className="dj-page-switch">
            Já tem cadastro?{" "}
            <Link to="/dj">Entrar na Área do DJ</Link>
          </p>
        </header>
      )}
      {selectedPlan && !journeyComplete ? (
        <p className="plan-callout" role="status">
          Combo escolhido no visor: <strong>{PLAN_NAMES[selectedPlan]}</strong>. Grave o perfil para
          seguir ao portal e ao checkout da assinatura.
        </p>
      ) : null}
      <RegisterForm
        key={registerFormKey}
        selectedPlan={selectedPlan}
        onJourneyComplete={() => setJourneyComplete(true)}
      />
    </div>
  );
}
