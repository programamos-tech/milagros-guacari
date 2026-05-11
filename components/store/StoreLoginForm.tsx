"use client";

import { syncStoreCustomerFromSession } from "@/app/actions/store-customer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    router.replace(safeNext);
    router.refresh();
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
