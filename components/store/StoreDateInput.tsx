"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const weekdayShort = ["d", "l", "m", "m", "j", "v", "s"] as const;

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function isDateDisabled(d: Date, min?: string, max?: string): boolean {
  const iso = toInputDate(d);
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

const triggerClass =
  "flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-900 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] transition focus:border-[var(--store-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--store-accent)]/20";

export function StoreDateInput({
  id,
  name,
  value,
  onChange,
  required,
  min,
  max,
  allowEmpty = false,
  emptyLabel = "dd/mm/aaaa",
  className,
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupFixed, setPopupFixed] = useState<{ top: number; left: number } | null>(null);

  const selectedDate = allowEmpty
    ? value.trim()
      ? parseDateInput(value)
      : null
    : (parseDateInput(value) ?? null);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = selectedDate ?? (max ? parseDateInput(max) : null) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const POPUP_W = 288;
  const POPUP_GAP = 6;

  useLayoutEffect(() => {
    if (!open) {
      setPopupFixed(null);
      return;
    }

    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let left = r.left;
      if (left + POPUP_W > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - POPUP_W - 8);
      }
      let top = r.bottom + POPUP_GAP;
      const estH = 340;
      if (top + estH > window.innerHeight - 8 && r.top > estH + POPUP_GAP) {
        top = Math.max(8, r.top - estH - POPUP_GAP);
      } else if (top + estH > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - estH - 8);
      }
      setPopupFixed({ top, left });
    };

    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, view]);

  const days = useMemo(() => {
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    const startOffset = start.getDay();
    const firstGridDate = new Date(start);
    firstGridDate.setDate(start.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(firstGridDate);
      d.setDate(firstGridDate.getDate() + i);
      return d;
    });
  }, [view]);

  const todayIso = toInputDate(new Date());

  return (
    <div ref={anchorRef} className={className ?? "relative w-full max-w-[12rem]"}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen((prev) => {
            if (prev) return false;
            const p = allowEmpty
              ? value.trim()
                ? parseDateInput(value)
                : null
              : parseDateInput(value);
            const base = p ?? (max ? parseDateInput(max) : null) ?? new Date();
            setView(new Date(base.getFullYear(), base.getMonth(), 1));
            return true;
          });
        }}
        className={triggerClass}
      >
        <span className={selectedDate ? "tabular-nums" : "text-stone-400"}>
          {selectedDate ? selectedDate.toLocaleDateString("es-CO") : emptyLabel}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-[var(--store-accent)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
        </svg>
      </button>

      {open && popupFixed && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              data-store-date-portal=""
              className="fixed z-[300] w-[18rem] rounded-xl border border-stone-200 bg-white p-3 shadow-[0_16px_40px_-20px_rgba(255,118,161,0.35)]"
              style={{ top: popupFixed.top, left: popupFixed.left }}
              role="dialog"
              aria-modal="true"
              aria-label="Elegir fecha"
            >
              <div className="mb-2 flex min-w-0 items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                  className="shrink-0 rounded-md px-2 py-1 text-stone-600 transition hover:bg-[#fff4f8] hover:text-[var(--store-accent)]"
                  aria-label="Mes anterior"
                >
                  ←
                </button>
                <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-[var(--store-brand)]">
                  {monthLabel(view)}
                </p>
                <button
                  type="button"
                  onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                  className="shrink-0 rounded-md px-2 py-1 text-stone-600 transition hover:bg-[#fff4f8] hover:text-[var(--store-accent)]"
                  aria-label="Mes siguiente"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                {weekdayShort.map((w, i) => (
                  <span key={`dow-${i}`}>{w}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const inMonth = d.getMonth() === view.getMonth();
                  const active =
                    selectedDate !== null &&
                    d.getFullYear() === selectedDate.getFullYear() &&
                    d.getMonth() === selectedDate.getMonth() &&
                    d.getDate() === selectedDate.getDate();
                  const disabled = isDateDisabled(d, min, max);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        onChange(toInputDate(d));
                        setOpen(false);
                      }}
                      className={[
                        "h-8 rounded-md text-sm tabular-nums transition",
                        disabled
                          ? "cursor-not-allowed text-stone-300"
                          : active
                            ? "bg-[var(--store-accent)] font-semibold text-white"
                            : inMonth
                              ? "text-stone-800 hover:bg-[#fff4f8] hover:text-[var(--store-accent)]"
                              : "text-stone-400 hover:bg-stone-50",
                      ].join(" ")}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2">
                <div className="flex flex-wrap gap-2">
                  {allowEmpty ? (
                    <button
                      type="button"
                      onClick={() => {
                        onChange("");
                        setOpen(false);
                      }}
                      className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500 transition hover:bg-stone-50"
                    >
                      Borrar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const today = parseDateInput(todayIso);
                      if (today && !isDateDisabled(today, min, max)) {
                        onChange(todayIso);
                        setOpen(false);
                      }
                    }}
                    className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--store-accent)] transition hover:bg-[#fff4f8]"
                  >
                    Hoy
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
                >
                  Cerrar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
