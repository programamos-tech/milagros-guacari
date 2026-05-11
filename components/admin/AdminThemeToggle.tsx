"use client";

import { useAdminTheme } from "@/components/admin/AdminThemeProvider";

function IconMoon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

type Props = { className?: string };

export function AdminThemeToggle({ className = "" }: Props) {
  const ctx = useAdminTheme();
  if (!ctx) return null;

  const isDark = ctx.resolved === "dark";
  return (
    <button
      type="button"
      onClick={() => ctx.setTheme(isDark ? "light" : "dark")}
      className={`rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      {isDark ? <IconSun className="size-5" /> : <IconMoon className="size-5" />}
    </button>
  );
}
