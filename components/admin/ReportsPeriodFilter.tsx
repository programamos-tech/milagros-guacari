"use client";

import { AdminDateInput, ADMIN_DATE_PORTAL_SELECTOR } from "@/components/admin/product-form-primitives";
import {
  addCalendarDaysReport,
  prettyReportPeriodLabel,
  REPORT_DEFAULT_RANGE_DAY_COUNT,
} from "@/lib/admin-report-range";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const panelClass =
  "absolute right-0 top-[calc(100%+0.35rem)] z-40 w-[min(100vw-1.5rem,22rem)] rounded-xl border border-rose-200/60 bg-white p-4 shadow-[0_16px_48px_-24px_rgba(190,24,93,0.18)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_16px_48px_-24px_rgba(0,0,0,0.55)]";

const tabBtn =
  "flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition";

export function ReportsPeriodFilter({
  rangeFrom,
  rangeTo,
  todayKey,
}: {
  rangeFrom: string;
  rangeTo: string;
  todayKey: string;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"day" | "range">("day");
  const [singleDay, setSingleDay] = useState(todayKey);
  const [from, setFrom] = useState(rangeFrom);
  const [to, setTo] = useState(rangeTo);

  useEffect(() => {
    setFrom(rangeFrom);
    setTo(rangeTo);
    setSingleDay(rangeFrom === rangeTo ? rangeFrom : todayKey);
  }, [rangeFrom, rangeTo, todayKey]);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t?.closest?.(ADMIN_DATE_PORTAL_SELECTOR)) return;
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const summary = useMemo(
    () => prettyReportPeriodLabel(rangeFrom, rangeTo, todayKey),
    [rangeFrom, rangeTo, todayKey],
  );

  function applyParams(nextFrom: string, nextTo: string) {
    let a = nextFrom;
    let b = nextTo;
    if (a > b) [a, b] = [b, a];
    const params = new URLSearchParams();
    params.set("from", a);
    params.set("to", b);
    router.push(`/admin?${params.toString()}`);
    setOpen(false);
  }

  function applyToday() {
    applyParams(todayKey, todayKey);
  }

  function applyDefaultWeek() {
    const span = Math.max(1, REPORT_DEFAULT_RANGE_DAY_COUNT) - 1;
    applyParams(addCalendarDaysReport(todayKey, -span), todayKey);
  }

  return (
    <div ref={wrapRef} className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-rose-200/70 bg-white px-3 py-2 text-sm font-medium text-rose-950 shadow-[0_1px_2px_0_rgb(190_24_93/0.06)] transition hover:border-rose-300/80 hover:bg-rose-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="tabular-nums">{summary}</span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-rose-900/45 transition dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-lg border border-rose-200/70 bg-white px-3 py-2 text-sm text-rose-950/85 shadow-[0_1px_2px_0_rgb(190_24_93/0.06)] transition hover:border-rose-300/80 hover:bg-rose-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
      >
        Actualizar
      </button>

      {open ? (
        <div className={panelClass} role="dialog" aria-label="Filtro de periodo">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={applyToday}
              className="w-full rounded-lg bg-rose-950 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              Solo hoy
            </button>
            <button
              type="button"
              onClick={applyDefaultWeek}
              className="w-full rounded-lg border border-rose-200/80 bg-white px-3 py-2.5 text-sm font-semibold text-rose-950 transition hover:bg-rose-50/70 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Últimos 7 días
            </button>
          </div>

          <div className="mt-4 flex gap-1 rounded-lg bg-rose-100/50 p-1 dark:bg-zinc-800/80">
            <button
              type="button"
              className={`${tabBtn} ${
                tab === "day"
                  ? "bg-white text-rose-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none"
                  : "text-rose-950/70 hover:text-rose-950 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              onClick={() => setTab("day")}
            >
              Un día
            </button>
            <button
              type="button"
              className={`${tabBtn} ${
                tab === "range"
                  ? "bg-white text-rose-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none"
                  : "text-rose-950/70 hover:text-rose-950 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
              onClick={() => setTab("range")}
            >
              Rango
            </button>
          </div>

          {tab === "day" ? (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-500">
                Día específico
              </p>
              <AdminDateInput name="report_day" value={singleDay} onChange={setSingleDay} />
              <button
                type="button"
                onClick={() => applyParams(singleDay, singleDay)}
                className="w-full rounded-lg border border-rose-200/70 bg-white px-3 py-2.5 text-sm font-semibold text-rose-950 transition hover:bg-rose-50/60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Aplicar
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-500">
                  Desde
                </p>
                <AdminDateInput name="report_from" value={from} onChange={setFrom} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-500">
                  Hasta
                </p>
                <AdminDateInput name="report_to" value={to} onChange={setTo} />
              </div>
              <button
                type="button"
                onClick={() => applyParams(from, to)}
                className="w-full rounded-lg border border-rose-200/70 bg-white px-3 py-2.5 text-sm font-semibold text-rose-950 transition hover:bg-rose-50/60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Aplicar rango
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
