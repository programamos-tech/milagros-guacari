"use client";

import { useEffect, useRef, useState } from "react";

export function ReportsAleyaExportButton({
  defaultYearMonth,
}: {
  defaultYearMonth: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setYearMonth(defaultYearMonth);
  }, [defaultYearMonth]);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function handleExport() {
    if (!yearMonth) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: yearMonth });
      const res = await fetch(
        `/api/admin/reports/aleya-export?${params.toString()}`,
      );
      if (!res.ok) {
        let message = "No se pudo exportar.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* ignore */
        }
        window.alert(message);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `ventas-aleya-${yearMonth}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      window.alert("Error de red al exportar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-rose-200/70 bg-white px-3 py-2 text-sm font-medium text-rose-950 shadow-[0_1px_2px_0_rgb(190_24_93/0.06)] transition hover:border-rose-300/80 hover:bg-rose-50/50 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-rose-900/50 dark:text-zinc-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            d="M12 3v12m0 0l4-4m-4 4L8 11M4 19h16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Exportar Excel ALEYA
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.35rem)] z-40 w-[min(100vw-1.5rem,20rem)] rounded-xl border border-rose-200/60 bg-white p-4 shadow-[0_16px_48px_-24px_rgba(190,24,93,0.18)] dark:border-zinc-700 dark:bg-zinc-900"
          role="dialog"
          aria-label="Exportar ventas mensuales"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 dark:text-zinc-500">
            Mes a exportar
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            Productos vendidos en el mes, con costos y utilidad. Los totales
            deben cuadrar con el resumen de reportes.
          </p>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="mt-3 w-full rounded-lg border border-rose-200/70 bg-white px-3 py-2 text-sm text-rose-950 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={loading || !yearMonth}
            className="mt-3 w-full rounded-lg bg-rose-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-900 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            {loading ? "Generando…" : "Descargar CSV"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
