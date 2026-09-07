import { COURSE_MODULES } from "../data/courses";
import { LESSON_ID_SET } from "../data/lesson-ids";
import { fetchAcademyProgress, loadApiToken, saveAcademyProgress } from "./dj-api";

const KEY = "mamute.academy.progress";
const LEGACY_KEY = "playerdj.academy.progress";

export function loadProgress(): string[] {
  const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string" && LESSON_ID_SET.has(id));
  } catch {
    return [];
  }
}

export function saveProgressLocal(done: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(done));
}

function mergeProgress(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote].filter((id) => LESSON_ID_SET.has(id)))];
}

export function toggleLesson(id: string): string[] {
  if (!LESSON_ID_SET.has(id)) return loadProgress();
  const current = new Set(loadProgress());
  if (current.has(id)) current.delete(id);
  else current.add(id);
  const next = [...current];
  saveProgressLocal(next);
  return next;
}

export async function toggleLessonAsync(id: string): Promise<string[]> {
  const next = toggleLesson(id);
  try {
    if (loadApiToken()) {
      await saveAcademyProgress(next);
    }
  } catch {
    /* progresso local já gravado */
  }
  return next;
}

export async function hydrateAcademyProgress(): Promise<string[] | null> {
  const local = loadProgress();
  try {
    if (!loadApiToken()) return null;

    const remote = await fetchAcademyProgress();
    if (!remote?.ok) return null;

    const merged = mergeProgress(local, remote.completedLessons);
    saveProgressLocal(merged);

    const needsSync =
      merged.length !== remote.completedLessons.length ||
      merged.some((lessonId) => !remote.completedLessons.includes(lessonId));

    if (needsSync) {
      await saveAcademyProgress(merged);
    }

    return merged;
  } catch {
    return null;
  }
}

export function completionRatio(done: string[]): number {
  const total = COURSE_MODULES.reduce((sum, mod) => sum + mod.lessons.length, 0);
  return total === 0 ? 0 : done.length / total;
}
