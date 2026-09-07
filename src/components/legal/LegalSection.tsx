const PRIVACY_SECTIONS = [
  {
    title: "Quem somos",
    body: "O MIXORAPlayerDJ é um visor pedagógico de mixer e academia para DJs. Esta política descreve como tratamos dados quando você navega no site, grava o perfil no Cadastro DJ, entra na Área do DJ ou usa o mixer e a academia no navegador.",
  },
  {
    title: "Dados que coletamos",
    body: "No cadastro de cabine você pode informar nome, contato, bio, gêneros, equipamento e redes sociais — todos opcionais exceto os campos marcados como obrigatórios no formulário. Também registramos progresso de aulas e preferências de catálogo, sempre no seu dispositivo, salvo quando você envia o formulário de cadastro via Netlify Forms (e-mail e dados do envio).",
  },
  {
    title: "Finalidade do tratamento",
    body: "Usamos essas informações para personalizar o visor, sugerir exercícios, confirmar o e-mail e redefinir a senha da Área do DJ, e, se você concordar, enviar avisos de aulas e eventos. Não vendemos dados pessoais nem usamos perfil de DJ para publicidade comportamental.",
  },
  {
    title: "Base legal (LGPD)",
    body: "O tratamento se apoia no consentimento (cadastro, newsletter, termos), na execução de funcionalidades que você solicita (salvar perfil, progresso da academia) e no legítimo interesse de melhorar a experiência pedagógica, sempre com transparência e minimização de dados.",
  },
  {
    title: "Compartilhamento",
    body: "Não compartilhamos seus dados com terceiros para marketing. Integrações de plataforma (Beatport, Spotify, YouTube, etc.) são apenas informativas no visor; quando você reproduz vídeo ou áudio embutido, o provedor correspondente pode processar dados conforme a política dele.",
  },
  {
    title: "Retenção e segurança",
    body: "Dados no localStorage permanecem até você limpar o navegador ou excluir o perfil manualmente. Envios de formulário seguem a retenção do provedor de hospedagem. Recomendamos dispositivo pessoal e senha forte no e-mail usado no cadastro.",
  },
  {
    title: "Seus direitos",
    body: "Você pode acessar, corrigir ou apagar o perfil editando o formulário em Cadastro DJ ou limpando o armazenamento local do site. Para solicitações sobre envios de formulário ou dúvidas sobre esta política, use o canal de contato indicado no site ou no e-mail informado no cadastro.",
  },
  {
    title: "Atualizações",
    body: "Podemos revisar esta política para refletir novas funcionalidades. A data da última versão aparece abaixo. O uso continuado após alterações relevantes indica ciência; mudanças substanciais serão destacadas na página inicial.",
  },
] as const;

const COOKIE_ROWS = [
  {
    name: "mamute.cookie.consent",
    type: "Essencial",
    purpose: "Registra se você aceitou ou limitou cookies e armazenamento opcional.",
    duration: "Até limpar o navegador",
  },
  {
    name: "mamute.dj.profile",
    type: "Funcional",
    purpose: "Perfil de DJ gravado no Cadastro DJ (nome artístico, contato, bio, etc.).",
    duration: "Até limpar o navegador",
  },
  {
    name: "mamute.dj.credentials",
    type: "Funcional",
    purpose: "Hash da senha de acesso ao portal (não armazenamos a senha em texto).",
    duration: "Até limpar o navegador",
  },
  {
    name: "mamute.dj.session",
    type: "Funcional",
    purpose: "Sessão da Área do DJ enquanto o portal está aberto neste dispositivo.",
    duration: "Até fechar a aba",
  },
  {
    name: "mamute.academy.progress",
    type: "Funcional",
    purpose: "Progresso de módulos e aulas da academia.",
    duration: "Até limpar o navegador",
  },
  {
    name: "YouTube (nocookie)",
    type: "Terceiro",
    purpose: "Player de vídeo na academia quando você inicia reprodução.",
    duration: "Conforme Google / YouTube",
  },
  {
    name: "Google Fonts",
    type: "Terceiro",
    purpose: "Carregamento de tipografias do visor.",
    duration: "Conforme Google",
  },
] as const;

const LAST_UPDATED = "29 de agosto de 2026";

export function LegalSection() {
  return (
    <section className="legal-home" aria-labelledby="legal-home-title">
      <header className="legal-home-head">
        <p className="kicker">Transparência · visor MIXORA</p>
        <h1 id="legal-home-title">Privacidade e cookies</h1>
        <p className="legal-home-lead">
          Como o MIXORAPlayerDJ trata seus dados no navegador, o que fica salvo localmente e quando
          serviços de terceiros entram em cena.
        </p>
        <p className="legal-home-updated">Última atualização: {LAST_UPDATED}</p>
      </header>

      <article className="legal-card" id="privacidade" aria-labelledby="privacy-title">
        <header className="legal-card-head">
          <span className="legal-card-badge" aria-hidden>
            01
          </span>
          <div>
            <h2 id="privacy-title">Política de privacidade</h2>
            <p>Tratamento de dados pessoais em conformidade com a LGPD (Lei nº 13.709/2018).</p>
          </div>
        </header>
        <div className="legal-card-body">
          {PRIVACY_SECTIONS.map((block) => (
            <div className="legal-block" key={block.title}>
              <h3>{block.title}</h3>
              <p>{block.body}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="legal-card" id="cookies" aria-labelledby="cookies-title">
        <header className="legal-card-head">
          <span className="legal-card-badge" aria-hidden>
            02
          </span>
          <div>
            <h2 id="cookies-title">Política de cookies</h2>
            <p>
              Cookies são pequenos arquivos; aqui também listamos chaves de{" "}
              <strong>localStorage</strong> usadas pelo visor no seu dispositivo.
            </p>
          </div>
        </header>
        <div className="legal-card-body">
          <p className="legal-intro">
            <strong>Cookies essenciais</strong> mantêm o site funcionando (por exemplo, sua escolha neste
            banner). <strong>Funcionais</strong> guardam perfil e progresso para você não perder o
            treino. <strong>Terceiros</strong> só entram quando você usa embeds (vídeo) ou fontes
            externas.
          </p>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th scope="col">Nome / origem</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Finalidade</th>
                  <th scope="col">Duração</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_ROWS.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <code>{row.name}</code>
                    </td>
                    <td>{row.type}</td>
                    <td>{row.purpose}</td>
                    <td>{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="legal-block">
            <h3>Como gerenciar</h3>
            <p>
              Você pode recusar cookies opcionais no banner ao entrar no site, limpar dados do
              navegador a qualquer momento ou usar modo anônimo. Recusar itens funcionais pode impedir
              salvar perfil de DJ e progresso da academia. Para alterar a escolha do banner, limpe o
              armazenamento local do site e recarregue a página.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
