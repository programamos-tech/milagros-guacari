"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminDateInput,
  productInputClass as inputClass,
} from "@/components/admin/product-form-primitives";
import { adminButtonToolbarOutlineClass } from "@/lib/admin-ui";
import type { VentaEstadoFilter, VentaPagoFilter } from "@/lib/ventas-sales";

function IconSearch() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none size-4 text-zinc-400 dark:text-zinc-500"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" strokeLinecap="round" />
    </svg>
  );
}

function buildQuery(
  pathname: string,
  next: {
    q?: string;
    status?: VentaEstadoFilter;
    payment?: VentaPagoFilter;
    from?: string;
    to?: string;
  },
  current: URLSearchParams,
) {
  const p = new URLSearchParams(current.toString());
  if (next.q !== undefined) {
    if (next.q.trim()) p.set("q", next.q.trim());
    else p.delete("q");
  }
  if (next.status !== undefined) {
    if (next.status === "all") p.delete("status");
    else p.set("status", next.status);
  }
  if (next.payment !== undefined) {
    if (next.payment === "all") p.delete("payment");
    else p.set("payment", next.payment);
  }
  if (next.from !== undefined) {
    const t = next.from.trim();
    if (t) p.set("from", t);
    else p.delete("from");
  }
  if (next.to !== undefined) {
    const t = next.to.trim();
    if (t) p.set("to", t);
    else p.delete("to");
  }
  if (
    next.q !== undefined ||
    next.status !== undefined ||
    next.payment !== undefined ||
    next.from !== undefined ||
    next.to !== undefined
  ) {
    p.delete("page");
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const filterLabelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400";

type VentasFiltersBarProps = {
  initialQ: string;
  initialFrom: string;
  initialTo: string;
};

export function VentasFiltersBar({ initialQ, initialFrom, initialTo }: VentasFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialQ);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const status = (searchParams.get("status") ?? "all") as VentaEstadoFilter;
  const payment = (searchParams.get("payment") ?? "all") as VentaPagoFilter;

  /* eslint-disable react-hooks/set-state-in-effect -- sincronizar con la URL (atrás/adelante), mismo patrón que egresos */
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setFrom(searchParams.get("from") ?? "");
    setTo(searchParams.get("to") ?? "");
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const pushQuery = useCallback(
    (patch: {
      q?: string;
      status?: VentaEstadoFilter;
      payment?: VentaPagoFilter;
      from?: string;
      to?: string;
    }) => {
      const url = buildQuery(pathname, patch, searchParams);
      router.replace(url);
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
        <div className="relative min-w-0 sm:col-span-2 lg:col-span-4">
          <label htmlFor="ventas-q" className={filterLabelClass}>
            Buscar
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <IconSearch />
            </span>
            <input
              id="ventas-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Factura, cliente…"
              className={`${inputClass} w-full min-w-0 pl-10`}
              autoComplete="off"
              aria-label="Buscar por factura o cliente"
            />
          </div>
        </div>
        <div className="min-w-0 lg:col-span-2">
          <label htmlFor="ventas-status" className={filterLabelClass}>
            Estado
          </label>
          <select
            id="ventas-status"
            value={status}
            onChange={(e) =>
              pushQuery({ status: e.target.value as VentaEstadoFilter })
            }
            className={`${inputClass} w-full min-w-0`}
          >
            <option value="all">Todas</option>
            <option value="paid">Finalizada</option>
            <option value="cancelled">Anulada</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallida</option>
          </select>
        </div>
        <div className="min-w-0 lg:col-span-2">
          <label htmlFor="ventas-payment" className={filterLabelClass}>
            Forma de pago
          </label>
          <select
            id="ventas-payment"
            value={payment}
            onChange={(e) =>
              pushQuery({ payment: e.target.value as VentaPagoFilter })
            }
            className={`${inputClass} w-full min-w-0`}
          >
            <option value="all">Todas</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="mixed">Mixto</option>
            <option value="online">En línea</option>
          </select>
        </div>
        <div className="min-w-0 lg:col-span-2">
          <label htmlFor="ventas-from" className={filterLabelClass}>
            Desde
          </label>
          <AdminDateInput
            id="ventas-from"
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
        <div className="min-w-0 lg:col-span-2">
          <label htmlFor="ventas-to" className={filterLabelClass}>
            Hasta
          </label>
          <AdminDateInput
            id="ventas-to"
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
      </div>
    </div>
  );
}

export function VentasRefreshButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={adminButtonToolbarOutlineClass}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" />
        <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" strokeLinecap="round" />
        <path d="M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Actualizar
    </button>
  );
}
