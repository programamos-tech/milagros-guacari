"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { STORE_HEADER_ICON_STROKE } from "@/lib/store-header-icons";

const EDGE_EPS = 4;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CatalogRowScroller({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    setCanLeft(scrollLeft > EDGE_EPS);
    setCanRight(scrollLeft < maxScroll - EDGE_EPS);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    const t = window.requestAnimationFrame(() => updateArrows());
    return () => {
      window.cancelAnimationFrame(t);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.max(200, Math.floor(el.clientWidth * 0.82));
    el.scrollBy({
      left: dir * delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div className={`relative min-w-0 max-w-full ${className}`.trim()}>
      <button
        type="button"
        aria-label="Anteriores"
        aria-hidden={!canLeft}
        tabIndex={canLeft ? 0 : -1}
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
        className={`absolute left-0 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200/90 bg-white/95 text-stone-700 shadow-sm transition hover:bg-white hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/50 sm:size-10 ${
          canLeft ? "" : "invisible pointer-events-none"
        }`}
      >
        <ChevronLeft
          className="size-5 sm:size-[1.35rem]"
          strokeWidth={STORE_HEADER_ICON_STROKE}
          aria-hidden
        />
      </button>
      <button
        type="button"
        aria-label="Siguientes"
        aria-hidden={!canRight}
        tabIndex={canRight ? 0 : -1}
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
        className={`absolute right-0 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200/90 bg-white/95 text-stone-700 shadow-sm transition hover:bg-white hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/50 sm:size-10 ${
          canRight ? "" : "invisible pointer-events-none"
        }`}
      >
        <ChevronRight
          className="size-5 sm:size-[1.35rem]"
          strokeWidth={STORE_HEADER_ICON_STROKE}
          aria-hidden
        />
      </button>

      <div
        ref={ref}
        className="store-cart-suggestions-scroll flex max-w-full snap-x snap-mandatory gap-3 overscroll-x-contain px-10 pb-2 pt-1 sm:gap-4 sm:px-11 lg:gap-5"
      >
        {children}
      </div>
    </div>
  );
}
