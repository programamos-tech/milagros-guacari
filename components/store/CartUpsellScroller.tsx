"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CartUpsellList } from "@/components/store/CartUpsellList";
import type { StoreCartUpsellProduct } from "@/lib/store-cart-upsells";

const SCROLL_EDGE_EPS = 6;

export function CartUpsellScroller({
  products,
  onAdded,
  title = "Complementa tu compra",
  subtitle = "Añade sin salir de la bolsa",
  titleId = "cart-upsell-scroller-title",
  className = "mt-2 border-t border-stone-200/90 pt-8",
}: {
  products: StoreCartUpsellProduct[];
  onAdded?: () => void;
  title?: string;
  subtitle?: string;
  titleId?: string;
  className?: string;
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
    <section className={className} aria-labelledby={titleId}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={titleId}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]"
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-stone-500">{subtitle}</p>
          ) : null}
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
