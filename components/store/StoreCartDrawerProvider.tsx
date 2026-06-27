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
import { setKitLineQuantity, setLineQuantity } from "@/app/actions/cart";
import { CartUpsellList } from "@/components/store/CartUpsellList";
import { formatCop } from "@/lib/money";
import type { StoreCartUpsellProduct } from "@/lib/store-cart-upsells";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";
import { STORE_IMAGE_QUALITY } from "@/lib/store-image";

export type StoreCartDrawerItem = {
  productId?: string;
  kitId?: string;
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

type StoreCartSuggestion = StoreCartUpsellProduct;

const SCROLL_EDGE_EPS = 6;

function CartDrawerUpsellScroller({
  products,
  onAdded,
}: {
  products: StoreCartUpsellProduct[];
  onAdded: () => void;
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
    const t = window.setTimeout(updateArrows, 150);
    return () => {
      window.clearTimeout(t);
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [products, updateArrows]);

  const scrollStep = useCallback((dir: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.72, 280);
    el.scrollBy({
      left: dir === "next" ? step : -step,
      behavior: "smooth",
    });
  }, []);

  if (products.length === 0) return null;

  const arrowBtnClass =
    "flex size-8 shrink-0 items-center justify-center border border-stone-300 text-stone-600 transition hover:border-[var(--store-accent)] hover:bg-[#fff8fb] hover:text-[var(--store-accent)]";

  return (
    <section
      className="mt-2 border-t border-stone-200/90 pt-8"
      aria-labelledby="store-cart-drawer-upsell-title"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="store-cart-drawer-upsell-title"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]"
          >
            Complementa tu compra
          </h3>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Añade sin salir de la bolsa
          </p>
        </div>
        {products.length > 1 ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className={`${arrowBtnClass} disabled:pointer-events-none disabled:opacity-30`}
              aria-label="Ver productos anteriores"
              disabled={!canPrev}
              onClick={() => scrollStep("prev")}
            >
              <ChevronLeft className="size-4" strokeWidth={1.35} aria-hidden />
            </button>
            <button
              type="button"
              className={`${arrowBtnClass} disabled:pointer-events-none disabled:opacity-30`}
              aria-label="Ver más productos"
              disabled={!canNext}
              onClick={() => scrollStep("next")}
            >
              <ChevronRight className="size-4" strokeWidth={1.35} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      <CartUpsellList
        products={products}
        title=""
        layout="scroll"
        listRef={scrollerRef}
        onAdded={onAdded}
      />
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
  const href = item.kitId ? "/kits" : `/products/${item.productId ?? ""}`;
  return (
    <li className="border-b border-stone-200/90 py-6">
      <div className="flex gap-4">
        <Link
          href={href}
          className="relative aspect-[3/4] w-[4.75rem] shrink-0 overflow-hidden bg-[#f0eeeb] sm:w-20"
        >
          {img ? (
            <Image
              src={img}
              alt=""
              fill
              className="object-cover object-center"
              sizes="80px"
              quality={STORE_IMAGE_QUALITY}
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
              href={href}
              className="text-[13px] font-semibold uppercase leading-snug tracking-wide text-[var(--store-brand)] transition hover:text-[var(--store-brand-hover)]"
            >
              {item.name}
            </Link>
            <div className="mt-3 space-y-1 text-[12px] text-stone-600">
              {item.kitId ? (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  Kit / combo
                </p>
              ) : null}
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
                <div className="inline-flex items-center border border-[var(--store-accent)]/25 bg-white">
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
  const [subtotalNetCents, setSubtotalNetCents] = useState(0);
  const [subtotalVatCents, setSubtotalVatCents] = useState(0);
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
        setSubtotalNetCents(0);
        setSubtotalVatCents(0);
        return;
      }
      const body = (await res.json()) as {
        items?: StoreCartDrawerItem[];
        subtotalCents?: number;
        subtotalNetCents?: number;
        subtotalVatCents?: number;
        suggestions?: StoreCartSuggestion[];
      };
      setItems(body.items ?? []);
      setSubtotalCents(Number(body.subtotalCents ?? 0));
      setSubtotalNetCents(Number(body.subtotalNetCents ?? 0));
      setSubtotalVatCents(Number(body.subtotalVatCents ?? 0));
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
    (item: StoreCartDrawerItem, nextQty: number) => {
      startLineTransition(() => {
        void (async () => {
          if (item.kitId) {
            await setKitLineQuantity(item.kitId, nextQty);
          } else if (item.productId) {
            await setLineQuantity(
              item.productId,
              nextQty,
              item.fragrance ?? undefined,
            );
          }
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
                className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--store-brand)]"
              >
                Bolsa de compras
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                className="flex size-9 shrink-0 items-center justify-center border border-[var(--store-accent)]/80 text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white"
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
                      className="border border-[var(--store-accent)] bg-[var(--store-accent)] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--store-accent-hover)]"
                    >
                      Explorar productos
                    </Link>
                  </div>
                  <CartDrawerUpsellScroller
                    products={suggestions}
                    onAdded={() => void reloadCart("quiet")}
                  />
                </>
              ) : (
                <>
                  <ul className="pb-2">
                    {items.map((item) => (
                      <DrawerLine
                        key={
                          item.kitId
                            ? `kit-${item.kitId}`
                            : `${item.productId}-${item.fragrance ?? ""}`
                        }
                        item={item}
                        pending={linePending}
                        onAdjustQty={(next) => adjustQty(item, next)}
                      />
                    ))}
                  </ul>
                  <CartDrawerUpsellScroller
                    products={suggestions}
                    onAdded={() => void reloadCart("quiet")}
                  />
                </>
              )}
            </div>

            {items.length > 0 ? (
              <footer className="border-t border-stone-200/80 bg-white px-6 pb-8 pt-6 sm:px-8">
                <dl className="space-y-2 text-[12px] text-stone-700">
                  {subtotalVatCents > 0 ? (
                    <>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-stone-600">Subtotal sin IVA</dt>
                        <dd className="tabular-nums text-stone-800">
                          {formatCop(subtotalNetCents)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-stone-600">IVA</dt>
                        <dd className="tabular-nums text-stone-800">
                          {formatCop(subtotalVatCents)}
                        </dd>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-4 border-t border-stone-200/90 pt-3 text-[13px] text-stone-800">
                    <dt className="font-medium uppercase tracking-[0.12em] text-stone-600">
                      Subtotal (con IVA)
                    </dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-stone-900">
                      {formatCop(subtotalCents)}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="mt-5 flex w-full items-center justify-center bg-[var(--store-accent)] py-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-[var(--store-accent-hover)]"
                >
                  Revisar y finalizar compra
                </Link>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="mt-4 block text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-stone-700 underline decoration-stone-400 underline-offset-4 transition hover:text-[var(--store-accent)]"
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
