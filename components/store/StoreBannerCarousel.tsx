"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type TransitionEvent,
} from "react";
import { shouldUnoptimizeStorageImageUrl, storagePublicObjectUrl } from "@/lib/storage-public-url";

export type StoreBannerSlide = {
  id: string;
  image_path: string;
  href: string | null;
  alt_text: string | null;
};

type Props = {
  slides: StoreBannerSlide[];
  variant: "hero" | "products";
  autoMs?: number;
  className?: string;
};

const trackTransitionClass =
  "transition-[transform] duration-[650ms] ease-[cubic-bezier(0.33,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0";

export function StoreBannerCarousel({
  slides,
  variant,
  autoMs = 5500,
  className = "",
}: Props) {
  const [trackIndex, setTrackIndex] = useState(0);
  const instantRef = useRef(false);

  const validSlides = useMemo(
    () => slides.filter((s) => storagePublicObjectUrl(s.image_path)),
    [slides],
  );
  const n = validSlides.length;
  /** +1 clon del primer slide al final para animar último → primero sin saltos. */
  const panelCount = n <= 1 ? 1 : n + 1;

  const go = useCallback(
    (delta: number) => {
      if (n <= 1) return;
      setTrackIndex((i) => {
        if (delta === 1) {
          if (i === n - 1) {
            instantRef.current = false;
            return n;
          }
          if (i === n) {
            queueMicrotask(() => {
              setTrackIndex((j) => {
                if (j !== 0) return j;
                instantRef.current = false;
                return 1;
              });
            });
            instantRef.current = true;
            return 0;
          }
          instantRef.current = false;
          return i + 1;
        }
        if (i === n) {
          instantRef.current = false;
          return n - 1;
        }
        if (i === 0) {
          instantRef.current = true;
          return n - 1;
        }
        instantRef.current = false;
        return i - 1;
      });
    },
    [n],
  );

  const goTo = useCallback(
    (j: number) => {
      if (n <= 1) return;
      const clamped = Math.max(0, Math.min(n - 1, j));
      setTrackIndex((i) => {
        if (i === clamped) return i;
        if (i === n) {
          instantRef.current = true;
          return clamped;
        }
        if (i === n - 1 && clamped === 0) {
          instantRef.current = false;
          return n;
        }
        instantRef.current = Math.abs(i - clamped) > 1;
        return clamped;
      });
    },
    [n],
  );

  const onTrackTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "transform") return;
      if (e.target !== e.currentTarget) return;
      setTrackIndex((prev) => {
        if (n > 1 && prev === n) {
          instantRef.current = true;
          return 0;
        }
        return prev;
      });
    },
    [n],
  );

  useLayoutEffect(() => {
    if (instantRef.current) {
      instantRef.current = false;
    }
  });

  useEffect(() => {
    setTrackIndex((i) => {
      if (n <= 0) return 0;
      if (n === 1) return 0;
      if (i > n) return n;
      return i;
    });
  }, [n]);

  useEffect(() => {
    if (n <= 1 || autoMs <= 0) return;
    const t = setInterval(() => go(1), autoMs);
    return () => clearInterval(t);
  }, [n, autoMs, go]);

  /** Si no hay transición CSS (p. ej. prefers-reduced-motion), igual hay que volver del clon al índice 0. */
  useEffect(() => {
    if (n <= 1 || trackIndex !== n) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches) return;
    instantRef.current = true;
    setTrackIndex(0);
  }, [trackIndex, n]);

  if (n === 0) return null;

  const frameClass =
    variant === "hero"
      ? "relative aspect-[5/3] w-full min-h-[200px] max-h-[min(85vh,720px)] sm:aspect-[21/9] sm:min-h-[280px]"
      : "relative aspect-[21/9] min-h-[140px] w-full max-h-[280px] sm:max-h-[320px]";

  const sizes =
    variant === "hero"
      ? "100vw"
      : "(max-width: 768px) 100vw, 896px";

  const shell =
    variant === "hero"
      ? "relative w-full overflow-hidden bg-stone-100"
      : "relative w-full overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/70";

  const defaultAlt =
    variant === "hero" ? "Banner principal" : "Promoción en productos";

  const panels =
    n <= 1
      ? validSlides.map((s) => ({ slide: s, isClone: false as const }))
      : [
          ...validSlides.map((s) => ({ slide: s, isClone: false as const })),
          { slide: validSlides[0]!, isClone: true as const },
        ];

  const translatePct = (-trackIndex * 100) / panelCount;
  const trackWidthPct = panelCount * 100;
  const slideWidthPct = 100 / panelCount;
  const instant = instantRef.current;
  const dotActiveIndex = n > 1 && trackIndex === n ? 0 : Math.min(trackIndex, n - 1);

  return (
    <div className={`${shell} ${className}`}>
      <div className={`${frameClass} overflow-hidden`}>
        <div
          className={`flex h-full ${instant ? "" : trackTransitionClass}`}
          style={{
            width: `${trackWidthPct}%`,
            transform: `translateX(${translatePct}%)`,
          }}
          onTransitionEnd={n > 1 ? onTrackTransitionEnd : undefined}
        >
          {panels.map(({ slide, isClone }, i) => {
            const url = storagePublicObjectUrl(slide.image_path)!;
            const alt = slide.alt_text?.trim() || defaultAlt;
            const href = slide.href?.trim();

            const image = (
              <Image
                src={url}
                alt={alt}
                fill
                className="object-cover"
                sizes={sizes}
                unoptimized={shouldUnoptimizeStorageImageUrl(url)}
                priority={i === 0}
              />
            );

            const body =
              href && href.length > 0 ? (
                <Link
                  href={href}
                  className="relative block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b7f6a] focus-visible:ring-offset-2"
                >
                  {image}
                </Link>
              ) : (
                image
              );

            return (
              <div
                key={isClone ? `${slide.id}-loop-clone` : slide.id}
                className="relative h-full shrink-0 overflow-hidden"
                style={{ width: `${slideWidthPct}%` }}
              >
                {body}
              </div>
            );
          })}
        </div>
      </div>

      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-stone-700 shadow-md ring-1 ring-stone-200/80 transition hover:bg-white"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-stone-700 shadow-md ring-1 ring-stone-200/80 transition hover:bg-white"
            aria-label="Siguiente"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
            {validSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition ${i === dotActiveIndex ? "w-6 bg-white shadow-sm" : "w-2 bg-white/55 hover:bg-white/85"}`}
                aria-label={`Ir al banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
