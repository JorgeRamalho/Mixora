import { LESSON_ID_SET } from "../../../src/data/lesson-ids.js";

export function sanitizeCompletedLessons(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const unique = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed || !LESSON_ID_SET.has(trimmed)) continue;
    unique.add(trimmed);
  }
  return [...unique];
}
