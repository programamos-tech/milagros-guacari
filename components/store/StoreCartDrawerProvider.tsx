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
import { usePathname, useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { setKitLineQuantity, setLineQuantity } from "@/app/actions/cart";
import { CartUpsellScroller } from "@/components/store/CartUpsellScroller";
import {
  STORE_CHECKOUT_ROUTE_MESSAGES,
  StoreMotivationalOverlay,
} from "@/components/store/StoreMotivationalOverlay";
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

type StoreCartDrawerContextValue = {
  openCart: () => void;
  closeCart: () => void;
  isOpen: boolean;
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
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoreCartDrawerItem[]>([]);
  const [suggestions, setSuggestions] = useState<StoreCartSuggestion[]>([]);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [subtotalNetCents, setSubtotalNetCents] = useState(0);
  const [subtotalVatCents, setSubtotalVatCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [goingCheckout, setGoingCheckout] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasCachedItemsRef = useRef(false);

  const applyCartBody = useCallback(
    (body: {
      items?: StoreCartDrawerItem[];
      subtotalCents?: number;
      subtotalNetCents?: number;
      subtotalVatCents?: number;
      suggestions?: StoreCartSuggestion[];
    }, opts?: { keepSuggestions?: boolean }) => {
      const nextItems = body.items ?? [];
      setItems(nextItems);
      hasCachedItemsRef.current = nextItems.length > 0;
      setSubtotalCents(Number(body.subtotalCents ?? 0));
      setSubtotalNetCents(Number(body.subtotalNetCents ?? 0));
      setSubtotalVatCents(Number(body.subtotalVatCents ?? 0));
      if (!opts?.keepSuggestions) {
        setSuggestions(body.suggestions ?? []);
      }
    },
    [],
  );

  const reloadCart = useCallback(
    async (mode: "full" | "quiet" = "full") => {
      const showSpinner = mode === "full" && !hasCachedItemsRef.current;
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch("/api/store/cart", { cache: "no-store" });
        if (!res.ok) {
          setItems([]);
          setSuggestions([]);
          setSubtotalCents(0);
          setSubtotalNetCents(0);
          setSubtotalVatCents(0);
          hasCachedItemsRef.current = false;
          return;
        }
        const body = (await res.json()) as {
          items?: StoreCartDrawerItem[];
          subtotalCents?: number;
          subtotalNetCents?: number;
          subtotalVatCents?: number;
        };
        applyCartBody(body, { keepSuggestions: true });
        if (showSpinner) setLoading(false);

        const exclude = (body.items ?? [])
          .map((i) => i.productId)
          .filter((id): id is string => Boolean(id))
          .join(",");
        void fetch(
          `/api/store/cart?only=suggestions&exclude=${encodeURIComponent(exclude)}`,
          { cache: "no-store" },
        )
          .then(async (sugRes) => {
            if (!sugRes.ok) return;
            const sugBody = (await sugRes.json()) as {
              suggestions?: StoreCartSuggestion[];
            };
            setSuggestions(sugBody.suggestions ?? []);
          })
          .catch(() => {
            /* ignore */
          });
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [applyCartBody],
  );

  // Precarga en idle: la primera apertura ya tiene datos.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void reloadCart("quiet");
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const t = window.setTimeout(run, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [reloadCart]);

  const openCart = useCallback(() => {
    setOpen(true);
    router.prefetch("/checkout");
    // Siempre quiet si ya hay cache: la UI abre al instante.
    void reloadCart(hasCachedItemsRef.current ? "quiet" : "full");
  }, [reloadCart, router]);

  const closeCart = useCallback(() => {
    setOpen(false);
  }, []);

  const goToCheckout = useCallback(() => {
    setGoingCheckout(true);
    setOpen(false);
    // Navegación dura: evita flash del home (layout) mientras carga el RSC de checkout.
    window.location.assign("/checkout");
  }, []);

  // El provider vive en el layout: apagar overlay solo al estar en checkout.
  useEffect(() => {
    if (pathname.startsWith("/checkout")) {
      setGoingCheckout(false);
    }
  }, [pathname]);

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
    () => ({ openCart, closeCart, isOpen: open }),
    [openCart, closeCart, open],
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
      <StoreMotivationalOverlay
        active={goingCheckout}
        messages={STORE_CHECKOUT_ROUTE_MESSAGES}
        zIndexClass="z-[120]"
      />
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
                <div className="space-y-4 py-6" aria-busy="true" aria-label="Cargando bolsa">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-4 border-b border-stone-100 pb-6">
                      <div className="aspect-[3/4] w-[4.75rem] shrink-0 animate-pulse bg-stone-100 sm:w-20" />
                      <div className="min-w-0 flex-1 space-y-3 pt-1">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
                        <div className="h-8 w-24 animate-pulse rounded bg-stone-100" />
                      </div>
                    </div>
                  ))}
                </div>
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
                  <CartUpsellScroller
                    products={suggestions}
                    titleId="store-cart-drawer-upsell-title"
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
                  <CartUpsellScroller
                    products={suggestions}
                    titleId="store-cart-drawer-upsell-title"
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
                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={goingCheckout}
                  className="mt-5 flex w-full items-center justify-center bg-[var(--store-accent)] py-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:cursor-wait disabled:opacity-80"
                >
                  {goingCheckout ? "Llevándote…" : "Revisar y finalizar compra"}
                </button>
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
