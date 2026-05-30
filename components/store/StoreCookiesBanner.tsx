"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { bereaSignaturePath, storeBrand } from "@/lib/brand";
import {
  STORE_POLICY_LINKS,
  acceptAllStorePolicies,
  acceptEssentialStoreCookies,
  hasStoreCookieConsent,
} from "@/lib/store-cookie-consent";
import { storeShellClass } from "@/lib/store-theme";

const policyLinkClass =
  "font-medium text-[var(--store-brand)] underline decoration-[var(--store-brand)]/35 underline-offset-[3px] transition hover:text-[var(--store-brand-hover)] hover:decoration-[var(--store-brand)]/70";

export function StoreCookiesBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [policiesChecked, setPoliciesChecked] = useState(false);

  const storedConsent = useSyncExternalStore(
    () => () => {},
    () => hasStoreCookieConsent(),
    () => true,
  );

  const dismiss = () => setDismissed(true);

  const onAcceptAll = () => {
    if (!policiesChecked) return;
    acceptAllStorePolicies();
    dismiss();
  };

  const onEssentialOnly = () => {
    acceptEssentialStoreCookies();
    dismiss();
  };

  if (storedConsent || dismissed) return null;

  return (
    <aside
      className="store-cookies-banner-panel fixed inset-x-0 bottom-0 z-[70] border-t border-rose-200/90 bg-[var(--store-chrome-bg)] shadow-[0_-12px_40px_-16px_rgba(255,118,161,0.35)]"
      role="dialog"
      aria-labelledby="store-cookies-title"
      aria-describedby="store-cookies-desc"
      aria-modal="false"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--store-brand)]/55 to-transparent"
        aria-hidden="true"
      />
      <div className={`${storeShellClass} flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-5 sm:py-3.5 lg:gap-6`}>
        <div className="min-w-0 flex-1 sm:max-w-[min(100%,22rem)] lg:max-w-sm">
          <p
            id="store-cookies-title"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--store-brand)]"
          >
            Cookies y privacidad
          </p>
          <p
            id="store-cookies-desc"
            className="mt-1 text-xs leading-snug text-stone-600 sm:text-[13px]"
          >
            En <strong className="font-medium text-stone-800">{storeBrand}</strong>{" "}
            usamos cookies para tu bolsa y preferencias. Aceptá las políticas o
            continuá solo con lo esencial.
          </p>
        </div>

        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 rounded-lg border border-rose-200/80 bg-white/80 px-3 py-2.5 transition hover:border-[var(--store-brand)]/35 hover:bg-white sm:max-w-md lg:max-w-lg">
          <input
            type="checkbox"
            checked={policiesChecked}
            onChange={(e) => setPoliciesChecked(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-rose-300 accent-[var(--store-brand)] focus:ring-[var(--store-brand)]/30"
          />
          <span className="text-[11px] leading-snug text-stone-600 sm:text-xs">
            Acepto la{" "}
            <Link href={STORE_POLICY_LINKS.cookies} className={policyLinkClass}>
              política de cookies
            </Link>
            ,{" "}
            <Link href={STORE_POLICY_LINKS.privacidad} className={policyLinkClass}>
              privacidad
            </Link>{" "}
            y los{" "}
            <Link href={STORE_POLICY_LINKS.terminos} className={policyLinkClass}>
              términos
            </Link>
            .
          </span>
        </label>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onAcceptAll}
            disabled={!policiesChecked}
            className="min-w-[9.5rem] flex-1 bg-[var(--store-accent)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none sm:px-5 sm:text-[11px]"
          >
            Aceptar y continuar
          </button>
          <button
            type="button"
            onClick={onEssentialOnly}
            className="min-w-[9.5rem] flex-1 border border-rose-200/90 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-800 transition hover:border-[var(--store-brand)]/50 hover:text-[var(--store-brand)] sm:flex-none sm:px-5 sm:text-[11px]"
          >
            Solo esenciales
          </button>
        </div>

        <div className="hidden shrink-0 items-center gap-2 border-l border-rose-200/70 pl-5 xl:flex">
          <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-rose-700/65">
            Experiencia por
          </span>
          <Image
            src={bereaSignaturePath}
            alt="Berea"
            width={320}
            height={82}
            className="h-7 w-auto max-w-[5.5rem] object-contain invert mix-blend-multiply opacity-85"
          />
        </div>
      </div>
    </aside>
  );
}
