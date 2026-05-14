"use client";

import Link from "next/link";
import { ChevronRight, Menu, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  STORE_HEADER_ICON_LG,
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";
import type { StoreCategoryMenuItem } from "@/lib/fetch-store-categories";
import { useStoreAuthModals } from "@/components/store/StoreAuthModals";

export function StoreNavDropdowns({
  menuCategories,
  accountHref,
  accountLabel,
  guestOpensAuthDrawer = false,
}: {
  menuCategories: StoreCategoryMenuItem[];
  accountHref: string;
  accountLabel: string;
  /** Si es true, “Mi cuenta” / login abre el panel lateral en lugar de navegar. */
  guestOpensAuthDrawer?: boolean;
}) {
  const { openLogin } = useStoreAuthModals();
  const pathname = usePathname();
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
        aria-controls={`${baseId}-shop-drawer`}
        id={`${baseId}-shop-trigger`}
        onClick={() => setOpen((v) => !v)}
      >
        <Menu
          className={STORE_HEADER_ICON_LG}
          strokeWidth={STORE_HEADER_ICON_STROKE}
          aria-hidden
        />
        <span className="text-[13px]">Shop</span>
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ease-out ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={close}
      />

      {/* Drawer */}
      <div
        id={`${baseId}-shop-drawer`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-shop-drawer-title`}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(100vw-2rem,22rem)] flex-col bg-white shadow-[4px_0_24px_-4px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out sm:w-[min(100vw-3rem,24rem)] ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex shrink-0 justify-end px-4 pb-2 pt-4">
          <button
            type="button"
            onClick={close}
            className="inline-flex size-10 items-center justify-center border border-dashed border-stone-400 text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/50"
            aria-label="Cerrar menú"
          >
            <X className="size-5" strokeWidth={1.25} aria-hidden />
          </button>
        </div>

        <h2 id={`${baseId}-shop-drawer-title`} className="sr-only">
          Categorías y tienda
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">
          {menuCategories.length === 0 ? (
            <p className="py-6 text-sm text-stone-500">
              Todavía no hay categorías. Creálas en Administración → Catálogo.
            </p>
          ) : (
            <ul className="border-t border-stone-200">
              {menuCategories.map((c) => (
                <li key={c.id} className="border-b border-stone-200">
                  <Link
                    href={`/products?category=${c.id}`}
                    onClick={close}
                    className="flex items-center justify-between gap-4 py-4 text-left transition hover:bg-stone-50"
                  >
                    <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-stone-900">
                      {c.name}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-stone-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/products"
            onClick={close}
            className="mt-2 flex items-center justify-between gap-4 border-b border-stone-200 py-4 text-left transition hover:bg-stone-50"
          >
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-stone-900">
              Todo el catálogo
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-stone-400"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        </div>

        <div className="shrink-0 border-t border-stone-200 px-4 py-5">
          {guestOpensAuthDrawer ? (
            <button
              type="button"
              onClick={() => {
                close();
                openLogin();
              }}
              className="flex w-full items-center justify-between gap-4 py-1 text-left transition hover:opacity-80"
            >
              <span className="flex items-center gap-3">
                <UserRound
                  className="size-5 shrink-0 text-stone-900"
                  strokeWidth={STORE_HEADER_ICON_STROKE}
                  aria-hidden
                />
                <span className="text-sm font-normal text-stone-900">
                  {accountLabel}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-stone-400"
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          ) : (
            <Link
              href={accountHref}
              onClick={close}
              className="flex items-center justify-between gap-4 py-1 text-left transition hover:opacity-80"
            >
              <span className="flex items-center gap-3">
                <UserRound
                  className="size-5 shrink-0 text-stone-900"
                  strokeWidth={STORE_HEADER_ICON_STROKE}
                  aria-hidden
                />
                <span className="text-sm font-normal text-stone-900">
                  {accountLabel}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-stone-400"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          )}

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-5 text-[13px] text-stone-600">
            <Link
              href="/"
              onClick={close}
              className={
                pathname === "/"
                  ? "font-semibold text-stone-900"
                  : "transition hover:text-stone-900"
              }
            >
              Inicio
            </Link>
            <Link
              href="/quien-soy"
              onClick={close}
              className={
                pathname === "/quien-soy"
                  ? "font-semibold text-stone-900"
                  : "transition hover:text-stone-900"
              }
            >
              Quién soy
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
