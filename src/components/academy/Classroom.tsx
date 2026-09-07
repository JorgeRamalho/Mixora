import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { NavLink, useLocation } from "react-router";
import { COURSE_MODULES } from "../../data/courses";
import { EXERCISES, TIPS } from "../../data/academy";
import { LESSON_ID_SET } from "../../data/lesson-ids";
import { completionRatio, hydrateAcademyProgress, loadProgress, toggleLessonAsync } from "../../lib/academy";
import type { CourseLevel, LessonReference } from "../../types/academy";

const LEVEL_META: Record<CourseLevel, { label: string; accent: string }> = {
  iniciante: { label: "Iniciante", accent: "#00e8ff" },
  intermediario: { label: "Intermediário", accent: "#8b7cff" },
  avancado: { label: "Avançado", accent: "#ff2d95" },
  conclusao: { label: "Conclusão", accent: "#ffc14a" },
};

const TOTAL_LESSONS = COURSE_MODULES.reduce((sum, mod) => sum + mod.lessons.length, 0);

function splitReadingBlocks(references: LessonReference[]) {
  const splitAt = Math.ceil(references.length / 2);
  return [
    { kicker: "Leitura 01 · aprofundar", items: references.slice(0, splitAt) },
    { kicker: "Leitura 02 · complementar", items: references.slice(splitAt) },
  ].filter((block) => block.items.length > 0);
}

function ReadingBlock({ kicker, items }: { kicker: string; items: LessonReference[] }) {
  return (
    <article className="academy-readings-block">
      <p className="kicker">{kicker}</p>
      <ul className="academy-readings-list">
        {items.map((item) => (
          <li key={item.url}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <span>{item.source}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Classroom() {
  const location = useLocation();
  const [done, setDone] = useState<string[]>(() => loadProgress());
  const [activeId, setActiveId] = useState(COURSE_MODULES[0]?.lessons[0]?.id ?? "l-01");

  useEffect(() => {
    const lessonId = location.hash.replace(/^#/, "");
    if (LESSON_ID_SET.has(lessonId)) setActiveId(lessonId);
  }, [location.hash]);

  useEffect(() => {
    void hydrateAcademyProgress().then((merged) => {
      if (merged) setDone(merged);
    });
  }, []);

  const lesson = useMemo(() => {
    for (const module of COURSE_MODULES) {
      const found = module.lessons.find((item) => item.id === activeId);
      if (found) return { module, lesson: found };
    }
    return null;
  }, [activeId]);

  if (!lesson) return null;

  const ratio = Math.round(completionRatio(done) * 100);
  const level = LEVEL_META[lesson.module.level];
  const isDone = done.includes(lesson.lesson.id);
  const readingBlocks = lesson.lesson.references?.length
    ? splitReadingBlocks(lesson.lesson.references)
    : [];

  return (
    <>
    <div className="academy-workspace">
      <section
        className="home-showcase academy-classroom"
        id="sala-de-aula"
        aria-labelledby="academy-classroom-title"
      >
        <header className="academy-classroom-head">
          <div className="academy-classroom-copy">
            <p className="kicker">Sala de aula · progresso da cabine</p>
            <h2 id="academy-classroom-title">Módulos, vídeos e checklist</h2>
            <p>
              Quatro módulos e doze aulas alinhados ao mixer MIXORA. Marque cada checklist — o
              diploma é pedagógico; o palco real ainda pede horas de booth.
            </p>
          </div>
          <div className="academy-progress-wrap">
            <div
              className="academy-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={ratio}
              aria-label="Progresso do curso"
            >
              <span className="academy-progress-fill" style={{ width: `${ratio}%` }} />
            </div>
            <p className="academy-progress-meta">
              <strong>{ratio}%</strong>
              <span>
                {done.length} de {TOTAL_LESSONS} aulas
              </span>
            </p>
          </div>
        </header>

        <div className="academy-stage">
          <nav className="academy-nav" aria-label="Módulos do curso">
            {COURSE_MODULES.map((module) => {
              const meta = LEVEL_META[module.level];
              const moduleDone = module.lessons.filter((item) => done.includes(item.id)).length;
              return (
                <div
                  key={module.id}
                  className="academy-module"
                  style={{ "--module-accent": meta.accent } as CSSProperties}
                >
                  <div className="academy-module-head">
                    <p className="kicker">{meta.label}</p>
                    <h3>{module.title}</h3>
                    <span className="academy-module-count">
                      {moduleDone}/{module.lessons.length}
                    </span>
                  </div>
                  <div className="academy-lesson-list">
                    {module.lessons.map((item) => {
                      const selected = item.id === activeId;
                      const completed = done.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={
                            selected
                              ? "academy-lesson-btn is-active"
                              : completed
                                ? "academy-lesson-btn is-done"
                                : "academy-lesson-btn"
                          }
                          aria-current={selected ? "true" : undefined}
                          onClick={() => setActiveId(item.id)}
                        >
                          <span className="academy-lesson-mark" aria-hidden="true">
                            {completed ? "●" : "○"}
                          </span>
                          <span className="academy-lesson-copy">
                            <strong>{item.title}</strong>
                            <span>{item.duration}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <article
            className="card academy-lesson"
            aria-label="Aula em exibição"
            data-stage="10"
            style={{ "--lesson-accent": level.accent } as CSSProperties}
          >
            <div className="academy-lesson-glow" aria-hidden="true" />
            <header className="academy-lesson-head">
              <p className="kicker">
                {level.label} · {lesson.module.subtitle}
              </p>
              <h2>{lesson.lesson.title}</h2>
              <p className="academy-lesson-duration">{lesson.lesson.duration}</p>
            </header>
            <p className="academy-lesson-synopsis">{lesson.lesson.synopsis}</p>

            {lesson.lesson.youtubeId ? (
              <div className="academy-theater">
                <div className="academy-theater-bezel" aria-hidden="true">
                  <span>MIXORA CLASS · AULA PRINCIPAL</span>
                  <span>{lesson.lesson.duration}</span>
                </div>
                <div className="video-frame academy-video">
                  <iframe
                    title={lesson.lesson.title}
                    src={`https://www.youtube-nocookie.com/embed/${lesson.lesson.youtubeId}?rel=0`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="academy-theater academy-theater--lab">
                <div className="academy-theater-bezel" aria-hidden="true">
                  <span>LAB MIXER · PRÁTICA</span>
                  <span>{lesson.lesson.duration}</span>
                </div>
                <div className="academy-lab-stage">
                  <span className="academy-lab-glyph" aria-hidden="true">
                    A·B
                  </span>
                  <p>
                    Aula hands-on no mixer MIXORA e no visor. Siga o checklist e treine no simulador
                    CDJ com fone e BPM visível.
                  </p>
                  <NavLink className="btn" to="/mixer">
                    Abrir mixer para praticar
                  </NavLink>
                </div>
              </div>
            )}

            {lesson.lesson.supportVideos?.length ? (
              <div className="academy-support">
                <h3>Vídeos complementares</h3>
                <div className="academy-support-grid">
                  {lesson.lesson.supportVideos.map((video) => (
                    <figure className="academy-support-item" key={video.youtubeId}>
                      <div className="video-frame academy-video academy-video--compact">
                        <iframe
                          title={video.title}
                          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <figcaption>
                        <strong>{video.title}</strong>
                        {video.duration ? <span>{video.duration}</span> : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}

            {lesson.lesson.practiceNote ? (
              <p className="academy-practice-note">{lesson.lesson.practiceNote}</p>
            ) : null}

            <div className="academy-checklist">
              <h3>Checklist da aula</h3>
              <ul>
                {lesson.lesson.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <button
              className="btn btn-solid"
              type="button"
              onClick={() => void toggleLessonAsync(lesson.lesson.id).then(setDone)}
            >
              {isDone ? "Desmarcar aula" : "Concluir aula"}
            </button>
          </article>
        </div>
      </section>

      {readingBlocks.length ? (
        <section
          className="home-showcase academy-readings-panel"
          id="leitura-recomendada"
          aria-labelledby="academy-readings-title"
          style={{ "--show-accent": level.accent } as CSSProperties}
        >
          <header className="home-showcase-head academy-readings-head">
            <p className="kicker">Material de apoio · {lesson.lesson.title}</p>
            <h2 id="academy-readings-title">Leitura recomendada</h2>
            <p>
              Referências externas curadas para esta aula — fora do player, do checklist e do painel
              da aula ativa.
            </p>
          </header>
          <div className="academy-readings-grid">
            {readingBlocks.map((block) => (
              <ReadingBlock items={block.items} kicker={block.kicker} key={block.kicker} />
            ))}
          </div>
        </section>
      ) : null}
    </div>

      <section
        className="home-showcase academy-tips"
        id="dicas"
        aria-labelledby="academy-tips-title"
      >
        <header className="home-showcase-head">
          <p className="kicker">Boas práticas · cabine</p>
          <h2 id="academy-tips-title">Dicas e melhores práticas</h2>
          <p>Hábitos que separam o botão de sync de um DJ que segura a pista.</p>
        </header>
        <div className="academy-tip-grid">
          {TIPS.map((tip) => {
            const meta = LEVEL_META[tip.level];
            return (
              <article
                className="card academy-tip"
                key={tip.id}
                data-stage="8"
                style={{ "--tip-accent": meta.accent } as CSSProperties}
              >
                <p className="kicker">{meta.label}</p>
                <h3>{tip.title}</h3>
                <p>{tip.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="home-showcase academy-lab-section"
        id="laboratorio"
        aria-labelledby="academy-lab-title"
      >
        <header className="home-showcase-head">
          <p className="kicker">Treino cronometrado</p>
          <h2 id="academy-lab-title">Laboratório de exercícios</h2>
          <p>Treinos curtos para usar no mixer MIXORA com fone e o visor aberto.</p>
        </header>
        <div className="academy-exercise-grid">
          {EXERCISES.map((exercise, index) => (
            <article className="card academy-exercise" key={exercise.id} data-stage="8">
              <span className="academy-exercise-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="kicker">{exercise.duration}</p>
              <h3>{exercise.title}</h3>
              <p className="academy-exercise-goal">{exercise.goal}</p>
              <ol>
                {exercise.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
