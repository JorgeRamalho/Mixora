import { Classroom } from "../components/academy/Classroom";

export function AcademyPage() {
  return (
    <div className="page academy-page">
      <header className="academy-intro">
        <p className="kicker">Academia MIXORA · formação de cabine</p>
        <h1>Do primeiro beat à conclusão de cabine</h1>
        <p className="lede">
          Quatro módulos, doze aulas, dicas e um laboratório. Marque cada checklist. O diploma
          MIXORAPlayerDJ é pedagógico — o palco real ainda pede horas de booth.
        </p>
      </header>
      <Classroom />
    </div>
  );
}
