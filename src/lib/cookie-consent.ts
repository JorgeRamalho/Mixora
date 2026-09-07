const CONSENT_KEY = "mamute.cookie.consent";

export type CookieConsentChoice = "all" | "essential";

export interface CookieConsentState {
  choice: CookieConsentChoice;
  updatedAt: string;
}

export function loadCookieConsent(): CookieConsentState | null {
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (parsed.choice === "all" || parsed.choice === "essential") {
      return {
        choice: parsed.choice,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: CookieConsentChoice): CookieConsentState {
  const state: CookieConsentState = {
    choice,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  return state;
}

export function hasCookieConsent(): boolean {
  return loadCookieConsent() !== null;
}
