"use client";

import { useEffect, useState } from "react";
import { formatCop, formatCopCompact } from "@/lib/money";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/** Curva con frenado suave al final (números “pesados”). */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

export function AnimatedCopCents({
  cents,
  duration = 1000,
  delay = 0,
  className,
}: {
  cents: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const raw = Number(cents);
  const target = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  const [shown, setShown] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }
    setShown(0);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      setShown(Math.round(target * easeOutExpo(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setShown(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduced]);

  return <span className={className}>{formatCop(shown)}</span>;
}

/** Misma unidad que `formatCop` / totales POS (entero en “cents” del proyecto). */
export function AnimatedCopCompactCents({
  cents,
  duration = 1000,
  delay = 0,
  className,
}: {
  cents: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const raw = Number(cents);
  const target = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  const [shown, setShown] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }
    setShown(0);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      setShown(Math.round(target * easeOutExpo(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setShown(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduced]);

  return <span className={className}>{formatCopCompact(shown)}</span>;
}

/** Porcentaje con un decimal (0–100), animado desde 0. */
export function AnimatedPercentOneDecimal({
  value,
  duration = 900,
  delay = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const raw = Number(value);
  const targetTenths = Number.isFinite(raw)
    ? Math.max(0, Math.min(1000, Math.round(raw * 10)))
    : 0;
  const [shownTenths, setShownTenths] = useState(reduced ? targetTenths : 0);

  useEffect(() => {
    if (reduced) {
      setShownTenths(targetTenths);
      return;
    }
    setShownTenths(0);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      setShownTenths(Math.round(targetTenths * easeOutExpo(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setShownTenths(targetTenths);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetTenths, duration, delay, reduced]);

  const label = (shownTenths / 10).toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <span className={className}>
      {label}%
    </span>
  );
}

export function AnimatedInteger({
  value,
  duration = 900,
  delay = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const target = Math.max(0, Math.floor(Math.abs(Number(value))));
  const [shown, setShown] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }
    setShown(0);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      setShown(Math.round(target * easeOutExpo(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setShown(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduced]);

  return (
    <span className={className}>
      {new Intl.NumberFormat("es-CO").format(shown)}
    </span>
  );
}
