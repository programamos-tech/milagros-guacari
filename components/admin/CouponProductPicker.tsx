"use client";

import { useEffect, useState } from "react";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
} from "@/components/admin/product-form-primitives";

export type CouponProductPickerHit = {
  id: string;
  name: string;
  reference: string | null;
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CouponProductPicker({
  initialSelected,
  restrictInitially,
}: {
  initialSelected: CouponProductPickerHit[];
  restrictInitially: boolean;
}) {
  const [restrict, setRestrict] = useState(restrictInitially);
  const [selected, setSelected] = useState<CouponProductPickerHit[]>(
    initialSelected,
  );
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q.trim(), 280);
  const [hits, setHits] = useState<CouponProductPickerHit[]>([]);

  useEffect(() => {
    if (!restrict || debouncedQ.length < 1) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/admin/products-search?q=${encodeURIComponent(debouncedQ)}`)
      .then((r) => r.json())
      .then((j: { products?: CouponProductPickerHit[] }) => {
        if (!cancelled) setHits(j.products ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, restrict]);

  const selectedIds = new Set(selected.map((p) => p.id));
  const showHits =
    restrict && debouncedQ.length > 0 ? hits : [];

  return (
    <div className="space-y-3 sm:col-span-2">
      <input
        type="hidden"
        name="restrict_to_products"
        value={restrict ? "on" : "off"}
      />
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          checked={restrict}
          onChange={(e) => {
            const on = e.target.checked;
            setRestrict(on);
            if (!on) {
              setSelected([]);
              setQ("");
              setHits([]);
            }
          }}
          className="size-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900"
        />
        Solo aplicar el descuento a productos seleccionados
      </label>
      {restrict ? (
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Busca por nombre o referencia y agrega las referencias que entran en la promo. Si no
            eliges ninguna, no vas a poder guardar con esta opción activa.
          </p>
          <div>
            <label htmlFor="coupon-product-search" className={labelClass}>
              Buscar producto
            </label>
            <input
              id="coupon-product-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre o código de referencia…"
              autoComplete="off"
              className={inputClass}
            />
            {showHits.length > 0 ? (
              <ul className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-zinc-200 bg-white text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-none">
                {showHits.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {h.name}
                      </p>
                      {h.reference ? (
                        <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {h.reference}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={selectedIds.has(h.id)}
                      onClick={() => {
                        if (selectedIds.has(h.id)) return;
                        setSelected((prev) => [...prev, h]);
                        setQ("");
                        setHits([]);
                      }}
                      className="shrink-0 rounded-md border border-rose-950 bg-rose-950 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                    >
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {selected.length > 0 ? (
            <div>
              <p className={labelClass}>Productos con descuento ({selected.length})</p>
              <ul className="flex flex-wrap gap-2">
                {selected.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <span className="truncate">{p.name}</span>
                    <input type="hidden" name="coupon_product_id" value={p.id} />
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) => prev.filter((x) => x.id !== p.id))
                      }
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                      aria-label={`Quitar ${p.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
              Todavía no agregaste productos. El cupón no se puede guardar hasta que haya al menos
              uno.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
