"use client";

import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import {
  STORE_HEADER_ICON_LG,
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";
import type { StoreCategoryMenuItem } from "@/lib/fetch-store-categories";
import { storeBrand } from "@/lib/brand";

export function StoreNavDropdowns({
  menuCategories,
}: {
  menuCategories: StoreCategoryMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const baseId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const shopBtnClass =
    "group inline-flex items-center gap-2 rounded-none py-1 text-[13px] font-medium tracking-wide text-white/90 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)]";

  return (
    <nav aria-label="Principal" className="relative flex items-center">
      <button
        type="button"
        className={shopBtnClass}
        aria-expanded={open}
        aria-controls={`${baseId}-tienda-drawer`}
        id={`${baseId}-tienda-trigger`}
        onClick={() => setOpen((v) => !v)}
      >
        <Menu
          className={STORE_HEADER_ICON_LG}
          strokeWidth={STORE_HEADER_ICON_STROKE}
          aria-hidden
        />
        <span className="text-[13px]">Tienda</span>
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-stone-900/25 transition-opacity duration-200 ease-out ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={close}
      />

      <div
        id={`${baseId}-tienda-drawer`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-tienda-drawer-title`}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(100vw-2rem,20.5rem)] flex-col bg-[var(--store-announcement-bg)] shadow-[2px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out sm:w-[min(100vw-3rem,22rem)] ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[var(--store-header-bg)] px-4 py-3.5 text-[var(--store-header-fg)]">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
              {storeBrand}
            </p>
            <h2
              id={`${baseId}-tienda-drawer-title`}
              className="truncate text-base font-semibold tracking-tight text-white"
            >
              Tienda
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
            aria-label="Cerrar menú"
          >
            <X className="size-[1.125rem]" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-5 pt-1">
          {menuCategories.length === 0 ? (
            <p className="px-4 py-8 text-sm leading-relaxed text-stone-500">
              Todavía no hay categorías en el catálogo. Podés crearlas desde Administración →
              Catálogo.
            </p>
          ) : (
            <ul className="divide-y divide-rose-200/35">
              {menuCategories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${c.id}`}
                    onClick={close}
                    className="group flex items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-stone-800 transition hover:bg-white/50 active:bg-white/65"
                  >
                    <span className="min-w-0 leading-snug">{c.name}</span>
                    <ChevronRight
                      className="size-4 shrink-0 text-stone-400 transition group-hover:text-[var(--store-brand)]"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mx-4 my-2 h-px bg-rose-200/40" aria-hidden />

          <Link
            href="/products"
            onClick={close}
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold text-stone-900 transition hover:bg-white/50 active:bg-white/65"
          >
            <span>Todo el catálogo</span>
            <ChevronRight
              className="size-4 shrink-0 text-[var(--store-brand)]"
              strokeWidth={1.5}
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}
