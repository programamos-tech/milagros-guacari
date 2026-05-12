"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminDateInput,
  productInputClass as inputClass,
} from "@/components/admin/product-form-primitives";

function buildExpensesQuery(
  pathname: string,
  patch: { q?: string; from?: string; to?: string },
  current: URLSearchParams,
) {
  const p = new URLSearchParams(current.toString());
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue;
    const t = String(val).trim();
    if (!t) p.delete(key);
    else p.set(key, t);
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const filterLabelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400";

type Props = {
  initialQ: string;
  initialFrom: string;
  initialTo: string;
};

export function ExpensesFiltersBar({ initialQ, initialFrom, initialTo }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialQ);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setFrom(searchParams.get("from") ?? "");
    setTo(searchParams.get("to") ?? "");
  }, [searchParams]);

  const pushQuery = useCallback(
    (patch: { q?: string; from?: string; to?: string }) => {
      router.replace(buildExpensesQuery(pathname, patch, searchParams));
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const urlQ = searchParams.get("q") ?? "";
      if (q.trim() === urlQ.trim()) return;
      pushQuery({ q });
    }, 380);
    return () => clearTimeout(t);
  }, [q, pushQuery, searchParams]);

  return (
    <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="min-w-0 sm:col-span-2 lg:col-span-5">
          <label htmlFor="expense-q" className={filterLabelClass}>
            Concepto / notas
          </label>
          <input
            id="expense-q"
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className={inputClass}
            autoComplete="off"
            aria-label="Buscar egresos por concepto o notas"
          />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <label htmlFor="expense-from" className={filterLabelClass}>
            Desde
          </label>
          <AdminDateInput
            id="expense-from"
            name="from"
            value={from}
            allowEmpty
            emptyLabel="dd/mm/aaaa"
            onChange={(next) => {
              setFrom(next);
              pushQuery({ from: next });
            }}
          />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <label htmlFor="expense-to" className={filterLabelClass}>
            Hasta
          </label>
          <AdminDateInput
            id="expense-to"
            name="to"
            value={to}
            allowEmpty
            emptyLabel="dd/mm/aaaa"
            onChange={(next) => {
              setTo(next);
              pushQuery({ to: next });
            }}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setQ("");
              router.replace(pathname);
            }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-600 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
