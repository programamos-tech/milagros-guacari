"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Retraso al revelar (stagger suave entre cards). */
  delayMs?: number;
};

/**
 * Reveal al entrar en viewport (scroll). No anima en carga bloqueante:
 * los que ya están visibles se muestran al montar; el resto espera al scroll.
 */
export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  /** pending = SSR/hidratación sin ocultar; luego shown | hidden */
  const [phase, setPhase] = useState<"pending" | "hidden" | "shown">("pending");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("shown");
      return;
    }

    const alreadyInView = (() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      return rect.top < vh * 0.94 && rect.bottom > vh * 0.06;
    })();

    if (alreadyInView) {
      const id = window.requestAnimationFrame(() => setPhase("shown"));
      return () => window.cancelAnimationFrame(id);
    }

    setPhase("hidden");

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setPhase("shown");
        io.disconnect();
      },
      {
        root: null,
        // Anticipa un poco el reveal al bajar, sin dispara todo el home de golpe.
        rootMargin: "0px 0px -6% 0px",
        threshold: 0.08,
      },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const revealClass =
    phase === "pending"
      ? ""
      : phase === "shown"
        ? "store-reveal store-reveal-in"
        : "store-reveal store-reveal-out-below";

  const style: CSSProperties | undefined =
    phase === "hidden" || phase === "shown"
      ? {
          transitionDelay: phase === "shown" ? `${Math.max(0, delayMs)}ms` : "0ms",
        }
      : undefined;

  return (
    <div
      ref={ref}
      className={[revealClass, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
