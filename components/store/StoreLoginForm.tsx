"use client";

import { syncStoreCustomerFromSession } from "@/app/actions/store-customer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { friendlyStoreAuthError } from "@/components/store/store-auth-shared";
import {
  storeAuthFormErrorClass,
  storeAuthFormInputClass,
  storeAuthFormLabelClass,
  storeAuthFormPrimaryBtnClass,
} from "@/components/store/store-auth-form-primitives";

export function StoreLoginForm({
  onLoggedIn,
}: {
  /** Tras login correcto (p. ej. cerrar panel lateral). */
  onLoggedIn?: () => void;
} = {}) {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const authErrorParam = searchParams.get("auth_error");
  const authMessageParam = searchParams.get("auth_message");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authErrorParam === "access_denied" && authMessageParam?.includes("expired")) {
      setError(
        "El enlace de confirmación expiró. Regístrate de nuevo o pide un enlace nuevo al equipo.",
      );
      return;
    }
    if (authMessageParam) {
      setError(
        friendlyStoreAuthError(
          decodeURIComponent(authMessageParam.replace(/\+/g, " ")),
        ),
      );
      return;
    }
    if (authErrorParam) {
      setError("No se pudo completar el acceso. Intenta iniciar sesión de nuevo.");
    }
  }, [authErrorParam, authMessageParam]);

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
    if (signErr) {
      setLoading(false);
      setError(friendlyStoreAuthError(signErr.message));
      return;
    }

    try {
      await syncStoreCustomerFromSession();
    } catch {
      /* layout / checkout reintentan */
    } finally {
      setLoading(false);
    }

    onLoggedIn?.();

    const safeNext =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/cuenta";
    window.location.assign(safeNext);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <p className={storeAuthFormErrorClass}>{error}</p> : null}
      <label className="block">
        <span className={storeAuthFormLabelClass}>Correo electrónico</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          className={storeAuthFormInputClass}
        />
      </label>
      <label className="block">
        <span className={storeAuthFormLabelClass}>Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Tu contraseña"
          className={storeAuthFormInputClass}
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className={`${storeAuthFormPrimaryBtnClass} mt-1`}
      >
        {loading ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
