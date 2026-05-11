"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  STORE_FAVORITES_STORAGE_KEY,
  parseFavoriteIdsFromStorage,
  writeFavoriteIdsToStorage,
} from "@/lib/store-favorites";

type StoreFavoritesContextValue = {
  /** IDs en el orden en que el usuario los agregó */
  ids: readonly string[];
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  count: number;
};

const StoreFavoritesContext = createContext<StoreFavoritesContextValue | null>(
  null,
);

export function StoreFavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(parseFavoriteIdsFromStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE_FAVORITES_STORAGE_KEY) {
        setIds(parseFavoriteIdsFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((productId: string) => {
    setIds((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        writeFavoriteIdsToStorage(next);
      } catch {
        /* quota u otro */
      }
      return next;
    });
  }, []);

  const has = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const value = useMemo(
    (): StoreFavoritesContextValue => ({
      ids,
      ready,
      has,
      toggle,
      count: ids.length,
    }),
    [ids, ready, has, toggle],
  );

  return (
    <StoreFavoritesContext.Provider value={value}>
      {children}
    </StoreFavoritesContext.Provider>
  );
}

export function useStoreFavorites() {
  const ctx = useContext(StoreFavoritesContext);
  if (!ctx) {
    throw new Error("useStoreFavorites debe usarse dentro de StoreFavoritesProvider");
  }
  return ctx;
}
