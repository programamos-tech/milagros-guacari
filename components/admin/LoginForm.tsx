"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const labelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-zinc-400";

const platformEmail = process.env.NEXT_PUBLIC_PLATFORM_EMAIL ?? "";

function IconMail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} className={className} aria-hidden>
      <path d="M4 6h16v12H4V6Z" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} className={className} aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} className={className} aria-hidden>
      <path
        d="M2.25 12s3.75-7 9.75-7 9.75 7 9.75 7-3.75 7-9.75 7-9.75-7-9.75-7Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} className={className} aria-hidden>
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path
        d="M10.7 10.7a3 3 0 104.6 4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.88 5.24A10.4 10.4 0 0112 5c6 0 9.75 7 9.75 7a18.7 18.7 0 01-4.29 5.44M6.64 6.64A18.4 18.4 0 002.25 12s3.75 7 9.75 7c1.04 0 2-.15 2.9-.42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Misma base que inputs del panel + icono a la izquierda (sin caja de color). */
const iconInputWrap =
  "flex items-center gap-2.5 rounded-sm border border-neutral-300 bg-white px-3 transition-[border-color,box-shadow] duration-200 focus-within:border-rose-950 focus-within:shadow-[0_0_0_1px_rgba(136,19,55,0.35)] dark:border-zinc-600 dark:bg-zinc-900/80 dark:focus-within:border-zinc-300 dark:focus-within:shadow-[0_0_0_1px_rgba(212,212,216,0.35)]";

const iconInputInner =
  "min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500";

/** Supabase suele responder en inglés; lo pasamos a español y damos contexto útil. */
function friendlyAuthError(raw: string): string {
  const m = raw.trim().toLowerCase();
  if (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("invalid_grant") ||
    m.includes("wrong password")
  ) {
    return "Correo o contraseña incorrectos. Si eliminaste el usuario en Supabase o cambió la clave, crea de nuevo la cuenta o pide acceso al administrador.";
  }
  if (m.includes("email not confirmed")) {
    return "Tienes que confirmar el correo antes de entrar. Revisa tu bandeja o habilita “Confirm email” en Auth.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "No hay conexión o el servidor no respondió. Revisa tu internet e intenta de nuevo.";
  }
  return raw;
}

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    const supabase = createSupabaseBrowserClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signErr) {
      setError(friendlyAuthError(signErr.message));
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <p className="border border-neutral-200 border-l-neutral-950 bg-neutral-50 px-3.5 py-3 text-sm leading-relaxed text-neutral-900 dark:border-zinc-700 dark:border-l-red-400 dark:bg-red-950/25 dark:text-red-100">
          {error}
        </p>
      ) : null}
      <label className="block">
        <span className={labelClass}>Correo electrónico</span>
        <div className={iconInputWrap}>
          <IconMail className="size-[18px] shrink-0 text-neutral-400 dark:text-zinc-500" />
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            defaultValue={platformEmail}
            placeholder={platformEmail || "tu@email.com"}
            className={iconInputInner}
          />
        </div>
      </label>
      <label className="block">
        <span className={labelClass}>Contraseña</span>
        <div className={iconInputWrap}>
          <IconLock className="size-[18px] shrink-0 text-neutral-400 dark:text-zinc-500" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Tu contraseña"
            className={iconInputInner}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="-mr-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <IconEyeOff className="size-[18px]" />
            ) : (
              <IconEye className="size-[18px]" />
            )}
          </button>
        </div>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-sm border border-rose-950 bg-rose-950 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-[background-color,opacity] duration-200 hover:bg-rose-900 hover:border-rose-900 disabled:opacity-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
      >
        {loading ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
