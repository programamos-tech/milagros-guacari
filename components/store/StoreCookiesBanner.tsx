"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { bereaSignaturePath } from "@/lib/brand";

const CONSENT_KEY = "tiendas_cookie_consent_v1";

type Consent = "accepted" | "rejected";

export function StoreCookiesBanner() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY) as Consent | null;
    setVisible(saved !== "accepted" && saved !== "rejected");
    setReady(true);
  }, []);

  const save = (value: Consent) => {
    window.localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  };

  if (!ready || !visible) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[69] h-48 bg-gradient-to-t from-stone-900/[0.07] to-transparent motion-safe:animate-[store-cart-drawer-backdrop_0.35s_ease-out_forwards]"
        aria-hidden="true"
      />
      <aside
        className="store-cookies-banner-panel fixed inset-x-3 bottom-3 z-[70] overflow-hidden rounded-2xl border border-stone-200/90 bg-white/95 shadow-[0_22px_56px_-14px_rgba(41,37,36,0.22),0_0_0_1px_rgba(255,255,255,0.65)_inset] backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-xl"
        role="dialog"
        aria-label="Preferencias de cookies"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3d5240]/35 to-transparent" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
          <div className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full bg-gradient-to-b from-[#3d5240]/90 via-[#5c6e5b]/70 to-[#3d5240]/40 sm:top-6 sm:bottom-6" />

          <div className="min-w-0 flex-1 pl-4">
            <p className="font-berea-nova text-[15px] font-semibold tracking-tight text-stone-900 sm:text-base">
              Cookies en la tienda
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600 sm:text-sm">
              Usamos cookies para guardar tu bolsa de compras y preferencias de
              navegación. Podés aceptar o continuar solo con las esenciales.{" "}
              <Link
                href="/cookies"
                className="font-medium text-[#3d5240] underline decoration-[#3d5240]/35 underline-offset-[3px] transition-colors hover:text-[#2d3f30] hover:decoration-[#3d5240]/70"
              >
                Más sobre cookies
              </Link>
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => save("accepted")}
                className="rounded-full bg-gradient-to-b from-[#4d5f4c] to-[#3d5240] px-5 py-2.5 text-[12px] font-semibold tracking-wide text-white shadow-[0_8px_22px_-10px_rgba(61,82,64,0.85)] ring-1 ring-white/15 transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(61,82,64,0.65)] active:translate-y-0"
              >
                Aceptar
              </button>
              <button
                type="button"
                onClick={() => save("rejected")}
                className="rounded-full border border-stone-300/90 bg-white/90 px-5 py-2.5 text-[12px] font-semibold tracking-wide text-stone-800 shadow-[0_2px_12px_-6px_rgba(41,37,36,0.12)] transition-[transform,background-color,border-color] duration-200 hover:-translate-y-px hover:border-stone-400 hover:bg-stone-50 active:translate-y-0"
              >
                Solo esenciales
              </button>
            </div>
          </div>

          <div className="group/logo flex shrink-0 flex-col items-center justify-center gap-2 border-t border-stone-200/70 pt-5 sm:w-[min(42%,12.5rem)] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <span className="font-berea-nova text-[9px] font-medium uppercase tracking-[0.22em] text-stone-400">
              Experiencia por
            </span>
            <div className="relative w-full max-w-[13rem] rounded-2xl bg-gradient-to-br from-stone-50 via-white to-stone-100/90 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_28px_-14px_rgba(41,37,36,0.14)] ring-1 ring-stone-200/80 transition-[box-shadow,ring-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_46px_-18px_rgba(61,82,64,0.22),0_10px_28px_-14px_rgba(41,37,36,0.12)] group-hover/logo:ring-[#3d5240]/20">
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_30%_0%,rgba(61,82,64,0.06),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_35%_20%,rgba(61,82,64,0.12),transparent_60%)] opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:opacity-100" />
              <Image
                src={bereaSignaturePath}
                alt="Berea — diseño y desarrollo de software a la medida"
                width={340}
                height={92}
                className="relative mx-auto h-[4.5rem] w-auto max-w-full object-contain opacity-[0.9] transition-[opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:opacity-100 group-hover/logo:[filter:brightness(1.06)_contrast(1.03)_drop-shadow(0_12px_32px_rgba(61,82,64,0.16))] sm:h-[5.25rem]"
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
