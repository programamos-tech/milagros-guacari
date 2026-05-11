"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ProductQuantityInput,
  productInputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import { formatQuantityInputGrouping } from "@/lib/money";

type MovementMode = "replace" | "add";
type StockLoc = "local" | "warehouse";

type Props = {
  productName: string;
  referenceLabel: string;
  stockLocal: number;
  stockWarehouse: number;
  formAction: (formData: FormData) => void;
  returnTo: string;
};

function fmtQty(n: number) {
  return n <= 0 ? "0" : formatQuantityInputGrouping(n);
}

export function AdminUpdateStockForm({
  productName,
  referenceLabel,
  stockLocal,
  stockWarehouse,
  formAction,
  returnTo,
}: Props) {
  const [movementMode, setMovementMode] = useState<MovementMode>("replace");
  const [location, setLocation] = useState<StockLoc>("local");
  const [quantity, setQuantity] = useState(0);

  const currentForLoc = location === "local" ? stockLocal : stockWarehouse;

  const stockAfter = useMemo(() => {
    if (movementMode === "replace") return quantity;
    return currentForLoc + quantity;
  }, [movementMode, quantity, currentForLoc]);

  const afterLabel = useMemo(() => {
    if (movementMode === "add" && quantity <= 0) return "—";
    return `${fmtQty(stockAfter)} unidades`;
  }, [movementMode, quantity, stockAfter]);

  const cardBase =
    "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";
  const shellMain = `${cardBase} p-6 sm:p-8`;
  const shellAside = `${cardBase} p-6`;

  const toggleBase =
    "flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-500";
  const toggleInactive =
    "text-zinc-600 hover:bg-white/60 dark:text-zinc-400 dark:hover:bg-zinc-800/50";
  const toggleActive =
    "bg-white text-zinc-900 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600/80";

  const segmentWrap =
    "mt-2 flex rounded-xl border border-zinc-200/90 bg-zinc-100/70 p-1 dark:border-zinc-700 dark:bg-zinc-950/80";

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
      <input type="hidden" name="movement_mode" value={movementMode} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="return_to" value={returnTo} />

      <div className="space-y-8">
        <section className={shellMain}>
          <h2 className={sectionTitle}>Producto y movimiento</h2>

          <div className="mt-6">
            <span className={labelClass}>Buscar producto</span>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/90 bg-white/60 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950/60">
              <p className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                {productName}{" "}
                <span className="font-mono text-zinc-600 dark:text-zinc-400">({referenceLabel})</span>
              </p>
              <Link
                href="/admin/products"
                className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200/90 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600 dark:hover:bg-zinc-700"
              >
                Cambiar
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <span className={labelClass}>Tipo de movimiento</span>
            <div className={segmentWrap}>
              <button
                type="button"
                className={`${toggleBase} ${movementMode === "replace" ? toggleActive : toggleInactive}`}
                onClick={() => setMovementMode("replace")}
              >
                Reemplazar stock
              </button>
              <button
                type="button"
                className={`${toggleBase} ${movementMode === "add" ? toggleActive : toggleInactive}`}
                onClick={() => setMovementMode("add")}
              >
                Entrada (sumar)
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Reemplazar: el valor que ingresas es el nuevo stock total en la ubicación elegida.
              Entrada: sumas esa cantidad al stock actual en esa ubicación.
            </p>
          </div>

          <div className="mt-8">
            <span className={labelClass}>Ubicación</span>
            <div className={segmentWrap}>
              <button
                type="button"
                className={`${toggleBase} ${location === "local" ? toggleActive : toggleInactive}`}
                onClick={() => setLocation("local")}
              >
                Local
              </button>
              <button
                type="button"
                className={`${toggleBase} ${location === "warehouse" ? toggleActive : toggleInactive}`}
                onClick={() => setLocation("warehouse")}
              >
                Bodega
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Indicá si la entrada o el ajuste aplica al stock en local o en bodega.
            </p>
          </div>

          <div className="mt-8">
            <label htmlFor="stock-qty" className={labelClass}>
              Cantidad
            </label>
            <div className="mt-2">
              <ProductQuantityInput
                id="stock-qty"
                name="quantity"
                value={quantity}
                onChange={setQuantity}
              />
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="stock-reason" className={labelClass}>
              Motivo (opcional)
            </label>
            <textarea
              id="stock-reason"
              name="reason"
              rows={3}
              placeholder="Ej. Entrada por compra a proveedor"
              className={`${productInputClass} mt-2 resize-none`}
            />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className={shellAside}>
          <h2 className={sectionTitle}>Resumen del movimiento</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500 dark:text-zinc-400">Producto</dt>
              <dd className="max-w-[65%] text-right text-zinc-900 dark:text-zinc-100">{productName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500 dark:text-zinc-400">Tipo</dt>
              <dd className="text-right text-zinc-800 dark:text-zinc-200">
                {movementMode === "replace" ? "Reemplazar stock" : "Entrada (sumar)"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500 dark:text-zinc-400">Ubicación</dt>
              <dd className="text-right text-zinc-800 dark:text-zinc-200">
                {location === "local" ? "Local" : "Bodega"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
              <dt className="text-zinc-500 dark:text-zinc-400">Stock actual</dt>
              <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                {fmtQty(currentForLoc)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500 dark:text-zinc-400">Después del movimiento</dt>
              <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{afterLabel}</dd>
            </div>
          </dl>
        </section>

        <section className={shellAside}>
          <h2 className={sectionTitle}>Paso final</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Cuando confirmes, se actualizará el inventario de este producto.
          </p>
          <button
            type="submit"
            className="mt-6 w-full rounded-xl border border-zinc-900 bg-zinc-900 py-3.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Actualizar stock
          </button>
        </section>
      </div>
    </form>
  );
}
