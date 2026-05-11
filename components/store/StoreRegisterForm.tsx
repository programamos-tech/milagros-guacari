"use client";

import { syncStoreCustomerFromSession } from "@/app/actions/store-customer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { friendlyStoreAuthError } from "@/components/store/store-auth-shared";
import {
  storeAuthFormErrorClass,
  storeAuthFormHintClass,
  storeAuthFormInfoClass,
  storeAuthFormInputClass,
  storeAuthFormLabelClass,
  storeAuthFormPrimaryBtnClass,
} from "@/components/store/store-auth-form-primitives";
import { normalizeDocumentIdForMatch } from "@/lib/normalize-document-id";

export function StoreRegisterForm({
  onSuccess,
  inputClassName = storeAuthFormInputClass,
  submitButtonClassName = storeAuthFormPrimaryBtnClass,
}: {
  onSuccess?: () => void;
  inputClassName?: string;
  submitButtonClassName?: string;
} = {}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value
      .trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
      .trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;
    const documentRaw = (
      form.elements.namedItem("documentId") as HTMLInputElement
    ).value.trim();

    if (!name) {
      setLoading(false);
      setError("Ingresa tu nombre.");
      return;
    }

    const documentNorm = normalizeDocumentIdForMatch(documentRaw);
    if (!documentNorm) {
      setLoading(false);
      setError(
        "Escribí tu documento solo con números (mínimo 6 dígitos). Así podemos unirte con tus compras anteriores si ya compraste con nosotras.",
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, document_id: documentNorm },
      },
    });

    if (signErr) {
      setLoading(false);
      setError(friendlyStoreAuthError(signErr.message));
      return;
    }

    if (data.session) {
      try {
        await syncStoreCustomerFromSession();
      } catch {
        /* el layout /cuenta vuelve a intentar; no bloquear el flujo por fallo puntual */
      } finally {
        setLoading(false);
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/cuenta");
        router.refresh();
      }
      return;
    }

    setLoading(false);
    setInfo(
      "Te enviamos un correo para confirmar la cuenta. Cuando lo confirmes, puedes iniciar sesión.",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <p className={storeAuthFormErrorClass}>{error}</p> : null}
      {info ? <p className={storeAuthFormInfoClass}>{info}</p> : null}
      <label className="block">
        <span className={storeAuthFormLabelClass}>Nombre</span>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Cómo te llamamos"
          className={inputClassName}
        />
      </label>
      <label className="block">
        <span className={storeAuthFormLabelClass}>Cédula o documento</span>
        <input
          name="documentId"
          type="text"
          required
          autoComplete="off"
          inputMode="numeric"
          placeholder="Solo números, ej. 1234567890"
          className={inputClassName}
        />
        <p className={storeAuthFormHintClass}>
          Si ya compraste con nosotras, con este dato te reconocemos y unimos tu historial en esta
          cuenta.
        </p>
      </label>
      <label className="block">
        <span className={storeAuthFormLabelClass}>Correo electrónico</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClassName}
        />
      </label>
      <label className="block">
        <span className={storeAuthFormLabelClass}>Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className={inputClassName}
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className={`${submitButtonClassName} mt-1`}
      >
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
