"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Phase = "below" | "visible" | "above";

function phaseFromEntry(entry: IntersectionObserverEntry): Phase {
  if (entry.isIntersecting) {
    return "visible";
  }
  const rect = entry.boundingClientRect;
  const vh =
    typeof window !== "undefined" ? window.innerHeight : rect.bottom;
  const edge = 24;
  if (rect.bottom <= edge) {
    return "above";
  }
  if (rect.top >= vh - edge) {
    return "below";
  }
  return "visible";
}

function initialPhase(el: HTMLElement): Phase {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (r.top < vh && r.bottom > 0) {
    return "visible";
  }
  if (r.bottom <= 0) {
    return "above";
  }
  return "below";
}

/**
 * Animación al entrar/salir del viewport (vertical): fade + slide + leve escala.
 * Respeta `prefers-reduced-motion`.
 */
export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Retardo al aparecer (escalonado en grillas). */
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("below");
  const [reduceMotion, setReduceMotion] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduceMotion(true);
      setPhase("visible");
      return;
    }

    setPhase(initialPhase(el));

    const io = new IntersectionObserver(
      ([entry]) => {
        setPhase(phaseFromEntry(entry));
      },
      {
        threshold: [0, 0.08, 0.15, 0.25],
        rootMargin: "0px 0px -8% 0px",
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const revealClass =
    reduceMotion ?
      className.trim()
    : [
        "store-reveal",
        phase === "visible" ? "store-reveal-in"
        : phase === "above" ? "store-reveal-out-above"
        : "store-reveal-out-below",
        className,
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <div
      ref={ref}
      className={revealClass}
      style={
        reduceMotion || delayMs <= 0 ?
          undefined
        : { transitionDelay: phase === "visible" ? `${delayMs}ms` : "0ms" }
      }
    >
      {children}
    </div>
  );
}
