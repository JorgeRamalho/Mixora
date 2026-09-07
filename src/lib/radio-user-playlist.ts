const PLAYLIST_KEY = "mamute.radio.user-playlist";
const BOOTSTRAP_KEY = "mamute.radio.beginner-loaded";

export function loadUserPlaylistIds(): string[] {
  const raw = localStorage.getItem(PLAYLIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveUserPlaylistIds(ids: string[]): void {
  localStorage.setItem(PLAYLIST_KEY, JSON.stringify(ids));
}

export function togglePlaylistClip(clipId: string): string[] {
  const current = loadUserPlaylistIds();
  const next = current.includes(clipId)
    ? current.filter((id) => id !== clipId)
    : [...current, clipId];
  saveUserPlaylistIds(next);
  return next;
}

export function isClipInPlaylist(clipId: string): boolean {
  return loadUserPlaylistIds().includes(clipId);
}

export function markBeginnerPlaylistLoaded(): void {
  localStorage.setItem(BOOTSTRAP_KEY, "1");
}

export function wasBeginnerPlaylistLoaded(): boolean {
  return localStorage.getItem(BOOTSTRAP_KEY) === "1";
}
