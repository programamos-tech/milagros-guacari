/** Preferencias de cookies y políticas legales de la vitrina Milagros. */
export const STORE_COOKIE_CONSENT_KEY = "milagros_store_consent_v2";

export const STORE_POLICY_LINKS = {
  cookies: "/cookies",
  privacidad: "/privacidad",
  terminos: "/terminos",
} as const;

export type StoreCookieConsentChoice = "all" | "essential";

export type StoreCookieConsentRecord = {
  choice: StoreCookieConsentChoice;
  /** Políticas aceptadas explícitamente desde el banner. */
  policies: {
    cookies: boolean;
    privacidad: boolean;
    terminos: boolean;
  };
  acceptedAt: string;
};

export function parseStoreCookieConsent(
  raw: string | null,
): StoreCookieConsentRecord | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoreCookieConsentRecord;
    if (
      data &&
      (data.choice === "all" || data.choice === "essential") &&
      typeof data.acceptedAt === "string" &&
      data.policies &&
      typeof data.policies.cookies === "boolean"
    ) {
      return data;
    }
  } catch {
    /* legacy string values handled below */
  }
  if (raw === "accepted") {
    return {
      choice: "all",
      policies: { cookies: true, privacidad: true, terminos: true },
      acceptedAt: new Date(0).toISOString(),
    };
  }
  if (raw === "rejected") {
    return {
      choice: "essential",
      policies: { cookies: true, privacidad: false, terminos: false },
      acceptedAt: new Date(0).toISOString(),
    };
  }
  return null;
}

const LEGACY_CONSENT_KEY = "tiendas_cookie_consent_v1";

export function readStoreCookieConsent(): StoreCookieConsentRecord | null {
  if (typeof window === "undefined") return null;
  const current = parseStoreCookieConsent(
    window.localStorage.getItem(STORE_COOKIE_CONSENT_KEY),
  );
  if (current) return current;

  const legacy = parseStoreCookieConsent(
    window.localStorage.getItem(LEGACY_CONSENT_KEY),
  );
  if (legacy) {
    saveStoreCookieConsent(legacy);
    window.localStorage.removeItem(LEGACY_CONSENT_KEY);
    return legacy;
  }
  return null;
}

export function saveStoreCookieConsent(record: StoreCookieConsentRecord): void {
  window.localStorage.setItem(
    STORE_COOKIE_CONSENT_KEY,
    JSON.stringify(record),
  );
}

export function hasStoreCookieConsent(): boolean {
  return readStoreCookieConsent() !== null;
}

export function acceptAllStorePolicies(): StoreCookieConsentRecord {
  const record: StoreCookieConsentRecord = {
    choice: "all",
    policies: { cookies: true, privacidad: true, terminos: true },
    acceptedAt: new Date().toISOString(),
  };
  saveStoreCookieConsent(record);
  return record;
}

export function acceptEssentialStoreCookies(): StoreCookieConsentRecord {
  const record: StoreCookieConsentRecord = {
    choice: "essential",
    policies: { cookies: true, privacidad: false, terminos: false },
    acceptedAt: new Date().toISOString(),
  };
  saveStoreCookieConsent(record);
  return record;
}
