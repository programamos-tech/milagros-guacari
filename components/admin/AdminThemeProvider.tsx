"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "tiendas-admin-theme";

export type AdminThemeMode = "light" | "dark";

type AdminThemeContextValue = {
  theme: AdminThemeMode;
  setTheme: (t: AdminThemeMode) => void;
  resolved: AdminThemeMode;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function useAdminTheme(): AdminThemeContextValue | null {
  return useContext(AdminThemeContext);
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminThemeMode>("light");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "dark" || raw === "light") setThemeState(raw);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "dark" || e.newValue === "light") {
        setThemeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((t: AdminThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolved: theme }),
    [theme, setTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        data-admin-theme={theme}
        className="min-h-full bg-stone-50 text-stone-900 antialiased dark:bg-zinc-950 dark:text-zinc-100"
        style={{ colorScheme: theme === "dark" ? "dark" : "light" }}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
