"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StoreKitCard,
  type StoreKitCardKit,
} from "@/components/store/StoreKitCard";

type Props = {
  kits: StoreKitCardKit[];
};

export function HomeKitsCarousel({ kits }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, kits.length]);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-kit-slide]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.75;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (kits.length === 0) return null;

  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6"
        aria-label="Carrusel de kits y combos"
      >
        {kits.map((kit) => (
          <li
            key={kit.id}
            data-kit-slide
            className="w-[min(68vw,16.5rem)] shrink-0 snap-start sm:w-[14.5rem] lg:w-[16rem]"
          >
            <StoreKitCard kit={kit} />
          </li>
        ))}
      </ul>

      {kits.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            className="absolute left-0 top-[28%] z-10 hidden size-10 -translate-x-1/2 items-center justify-center border border-stone-200 bg-white text-stone-800 shadow-sm transition hover:border-[var(--store-accent)] hover:text-[var(--store-accent)] disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
            aria-label="Kits anteriores"
          >
            <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            className="absolute right-0 top-[28%] z-10 hidden size-10 translate-x-1/2 items-center justify-center border border-stone-200 bg-white text-stone-800 shadow-sm transition hover:border-[var(--store-accent)] hover:text-[var(--store-accent)] disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
            aria-label="Kits siguientes"
          >
            <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
