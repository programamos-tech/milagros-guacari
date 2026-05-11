/** Clave de localStorage para IDs de productos favoritos (orden de guardado). */
export const STORE_FAVORITES_STORAGE_KEY = "tiendas-store-favorites-v1" as const;

export function parseFavoriteIdsFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function writeFavoriteIdsToStorage(ids: string[]) {
  localStorage.setItem(STORE_FAVORITES_STORAGE_KEY, JSON.stringify(ids));
}
