"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { setLineQuantity } from "@/app/actions/cart";
import { formatCop } from "@/lib/money";
import { productColorSwatchClass } from "@/lib/product-colors";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

export type StoreCartDrawerItem = {
  productId: string;
  quantity: number;
  fragrance: string | null;
  name: string;
  priceCents: number;
  listPriceCents?: number | null;
  imagePath: string | null;
  firstColor: string | null;
  lineTotalCents: number;
  listLineTotalCents?: number | null;
  maxStock: number;
};

type StoreCartSuggestion = {
  id: string;
  name: string;
  priceCents: number;
  imagePath: string | null;
  colors: string[];
};

const SCROLL_EDGE_EPS = 6;

function CartDrawerSuggestionsRow({
  suggestions,
  onPickProduct,
}: {
  suggestions: StoreCartSuggestion[];
  onPickProduct: () => void;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const overflow = maxScroll > SCROLL_EDGE_EPS;
    setCanPrev(overflow && scrollLeft > SCROLL_EDGE_EPS);
    setCanNext(overflow && scrollLeft < maxScroll - SCROLL_EDGE_EPS);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [suggestions, updateArrows]);

  const scrollStep = useCallback((dir: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.72, 280);
    el.scrollBy({
      left: dir === "next" ? step : -step,
      behavior: "smooth",
    });
  }, []);

  if (suggestions.length === 0) return null;

  const arrowBtnClass =
    "flex size-8 shrink-0 items-center justify-center border border-stone-300 text-stone-600 transition hover:border-stone-900 hover:bg-stone-50 hover:text-stone-900";

  return (
    <section
      className="mt-2 border-t border-stone-200/90 pt-8"
      aria-labelledby="store-cart-drawer-suggestions-title"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3
          id="store-cart-drawer-suggestions-title"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900"
        >
          También te puede gustar
        </h3>
        <div className="flex min-h-8 shrink-0 items-center gap-1">
          {canPrev ? (
            <button
              type="button"
              className={arrowBtnClass}
              aria-label="Ver productos anteriores"
              onClick={() => scrollStep("prev")}
            >
              <ChevronLeft className="size-4" strokeWidth={1.35} aria-hidden />
            </button>
          ) : null}
          {canNext ? (
            <button
              type="button"
              className={arrowBtnClass}
              aria-label="Ver más productos"
              onClick={() => scrollStep("next")}
            >
              <ChevronRight className="size-4" strokeWidth={1.35} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <ul
        ref={scrollerRef}
        className="store-cart-suggestions-scroll -mx-1 flex list-none gap-3 px-1 pb-2"
      >
        {suggestions.map((s) => {
          const img = storagePublicObjectUrl(s.imagePath);
          const swatches = s.colors.slice(0, 4);
          const extraColors = Math.max(0, s.colors.length - swatches.length);
          return (
            <li key={s.id} className="w-[8.125rem] shrink-0">
              <Link
                href={`/products/${s.id}`}
                onClick={onPickProduct}
                className="block outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-stone-900/25 focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[11/13] w-full bg-[#f4f4f3]">
                  {img ? (
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="130px"
                      unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xl text-stone-200">
                      ◆
                    </div>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-stone-900">
                  {s.name}
                </p>
                <p className="mt-1 text-[11px] font-medium tabular-nums text-stone-900">
                  {formatCop(s.priceCents)}
                </p>
                {swatches.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {swatches.map((c, i) => (
                      <span
                        key={`${s.id}-sw-${i}`}
                        className={`size-4 shrink-0 rounded-full ${productColorSwatchClass(c)}`}
                        aria-hidden
                        title={c}
                      />
                    ))}
                    {extraColors > 0 ? (
                      <span className="text-[10px] font-medium tabular-nums text-stone-500">
                        +{extraColors}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type StoreCartDrawerContextValue = {
  openCart: () => void;
  closeCart: () => void;
};

const StoreCartDrawerContext =
  createContext<StoreCartDrawerContextValue | null>(null);

export function useStoreCartDrawer() {
  const ctx = useContext(StoreCartDrawerContext);
  if (!ctx) {
    throw new Error(
      "useStoreCartDrawer debe usarse dentro de StoreCartDrawerProvider",
    );
  }
  return ctx;
}

function DrawerLine({
  item,
  pending,
  onAdjustQty,
}: {
  item: StoreCartDrawerItem;
  pending: boolean;
  onAdjustQty: (nextQty: number) => void;
}) {
  const img = storagePublicObjectUrl(item.imagePath);
  return (
    <li className="border-b border-stone-200/90 py-6">
      <div className="flex gap-4">
        <Link
          href={`/products/${item.productId}`}
          className="relative size-24 shrink-0 bg-[#f0eeeb]"
        >
          {img ? (
            <Image
              src={img}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized={shouldUnoptimizeStorageImageUrl(img)}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl text-stone-200">
              ◆
            </div>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link
              href={`/products/${item.productId}`}
              className="text-[13px] font-semibold uppercase leading-snug tracking-wide text-stone-900 transition hover:text-stone-600"
            >
              {item.name}
            </Link>
            <div className="mt-3 space-y-1 text-[12px] text-stone-600">
              {item.fragrance ? (
                <p>
                  <span className="text-stone-500">Fragancia / tono:</span>{" "}
                  {item.fragrance}
                </p>
              ) : null}
              {item.firstColor ? (
                <p>
                  <span className="text-stone-500">Color:</span>{" "}
                  {item.firstColor}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-stone-500">Cant.</span>
                <div className="inline-flex items-center border border-stone-900/25 bg-white">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAdjustQty(item.quantity - 1)}
                    className="flex size-8 items-center justify-center text-stone-700 transition hover:bg-stone-100 disabled:opacity-35"
                    aria-label={
                      item.quantity <= 1
                        ? "Quitar de la bolsa"
                        : "Menos una unidad"
                    }
                  >
                    <Minus className="size-3.5" strokeWidth={1.35} />
                  </button>
                  <span className="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums text-stone-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={pending || item.quantity >= item.maxStock}
                    onClick={() => onAdjustQty(item.quantity + 1)}
                    className="flex size-8 items-center justify-center text-stone-700 transition hover:bg-stone-100 disabled:opacity-35"
                    aria-label="Más una unidad"
                  >
                    <Plus className="size-3.5" strokeWidth={1.35} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="shrink-0 pt-px text-[14px] font-medium tabular-nums text-stone-900">
            {item.listLineTotalCents != null &&
            item.listLineTotalCents > item.lineTotalCents ? (
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-normal text-stone-400 line-through">
                  {formatCop(item.listLineTotalCents)}
                </span>
                <span>{formatCop(item.lineTotalCents)}</span>
              </span>
            ) : (
              formatCop(item.lineTotalCents)
            )}
          </p>
        </div>
      </div>
    </li>
  );
}

export function StoreCartDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoreCartDrawerItem[]>([]);
  const [suggestions, setSuggestions] = useState<StoreCartSuggestion[]>([]);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const reloadCart = useCallback(async (mode: "full" | "quiet" = "full") => {
    if (mode === "full") setLoading(true);
    try {
      const res = await fetch("/api/store/cart", {
        cache: "no-store",
      });
      if (!res.ok) {
        setItems([]);
        setSuggestions([]);
        setSubtotalCents(0);
        return;
      }
      const body = (await res.json()) as {
        items?: StoreCartDrawerItem[];
        subtotalCents?: number;
        suggestions?: StoreCartSuggestion[];
      };
      setItems(body.items ?? []);
      setSubtotalCents(Number(body.subtotalCents ?? 0));
      setSuggestions(body.suggestions ?? []);
    } finally {
      if (mode === "full") setLoading(false);
    }
  }, []);

  const openCart = useCallback(() => {
    setOpen(true);
    void reloadCart("full");
  }, [reloadCart]);

  const closeCart = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeCart]);

  const value = useMemo(
    () => ({ openCart, closeCart }),
    [openCart, closeCart],
  );

  const [linePending, startLineTransition] = useTransition();

  const adjustQty = useCallback(
    (productId: string, fragrance: string | null, nextQty: number) => {
      startLineTransition(() => {
        void (async () => {
          await setLineQuantity(
            productId,
            nextQty,
            fragrance ?? undefined,
          );
          await reloadCart("quiet");
          router.refresh();
        })();
      });
    },
    [reloadCart, router],
  );

  return (
    <StoreCartDrawerContext.Provider value={value}>
      {children}
      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar bolsa de compras"
            className="store-cart-drawer-backdrop fixed inset-0 z-[65] bg-black/45"
            onClick={closeCart}
          />
          <div
            className="store-cart-drawer-panel fixed inset-y-0 right-0 z-[70] flex w-[min(100%,26rem)] flex-col bg-white shadow-[-12px_0_48px_rgba(15,23,42,0.12)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-cart-drawer-title"
          >
            <header className="flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-5 sm:px-8">
              <h2
                id="store-cart-drawer-title"
                className="text-[12px] font-semibold uppercase tracking-[0.18em] text-stone-900"
              >
                Bolsa de compras
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                className="flex size-9 shrink-0 items-center justify-center border border-stone-900/80 text-stone-900 transition hover:bg-stone-900 hover:text-white"
                aria-label="Cerrar"
              >
                <span className="text-lg font-light leading-none">×</span>
              </button>
            </header>

            <div className="store-cart-drawer-body-scroll flex min-h-0 flex-1 flex-col px-6 sm:px-8">
              {loading && items.length === 0 ? (
                <p className="py-12 text-center text-sm text-stone-500">
                  Cargando…
                </p>
              ) : items.length === 0 ? (
                <>
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
                    <p className="text-sm leading-relaxed text-stone-600">
                      Tu bolsa está vacía.
                    </p>
                    <Link
                      href="/products"
                      onClick={closeCart}
                      className="border border-stone-900 bg-stone-900 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-stone-800"
                    >
                      Explorar productos
                    </Link>
                  </div>
                  <CartDrawerSuggestionsRow
                    suggestions={suggestions}
                    onPickProduct={closeCart}
                  />
                </>
              ) : (
                <>
                  <ul className="pb-2">
                    {items.map((item) => (
                      <DrawerLine
                        key={`${item.productId}-${item.fragrance ?? ""}`}
                        item={item}
                        pending={linePending}
                        onAdjustQty={(next) =>
                          adjustQty(item.productId, item.fragrance, next)
                        }
                      />
                    ))}
                  </ul>
                  <CartDrawerSuggestionsRow
                    suggestions={suggestions}
                    onPickProduct={closeCart}
                  />
                </>
              )}
            </div>

            {items.length > 0 ? (
              <footer className="border-t border-stone-200/80 bg-white px-6 pb-8 pt-6 sm:px-8">
                <div className="flex items-baseline justify-between gap-4 text-[13px] text-stone-800">
                  <span className="font-medium uppercase tracking-[0.12em] text-stone-600">
                    Subtotal
                  </span>
                  <span className="text-[15px] font-semibold tabular-nums text-stone-900">
                    {formatCop(subtotalCents)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="mt-5 flex w-full items-center justify-center bg-stone-900 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-stone-800"
                >
                  Revisar y finalizar compra
                </Link>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="mt-4 block text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-stone-700 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-900"
                >
                  Seguir comprando
                </Link>
              </footer>
            ) : null}
          </div>
        </>
      ) : null}
    </StoreCartDrawerContext.Provider>
  );
}
