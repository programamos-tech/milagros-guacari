"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ProductQuantityInput,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import { formatQuantityInputGrouping } from "@/lib/money";

export type TransferDirection = "local_to_warehouse" | "warehouse_to_local";

type Props = {
  productName: string;
  stockLocal: number;
  stockWarehouse: number;
  formAction: (formData: FormData) => void;
  returnTo: string;
};

function fmtQty(n: number) {
  return n <= 0 ? "0" : formatQuantityInputGrouping(n);
}

export function AdminTransferStockForm({
  productName,
  stockLocal,
  stockWarehouse,
  formAction,
  returnTo,
}: Props) {
  const [direction, setDirection] = useState<TransferDirection>("local_to_warehouse");
  const [quantity, setQuantity] = useState(0);

  const fromLocal = direction === "local_to_warehouse";
  const available = fromLocal ? stockLocal : stockWarehouse;

  const { afterLocal, afterWh } = useMemo(() => {
    if (quantity <= 0) {
      return { afterLocal: stockLocal, afterWh: stockWarehouse };
    }
    const q = Math.min(quantity, available);
    if (fromLocal) {
      return {
        afterLocal: stockLocal - q,
        afterWh: stockWarehouse + q,
      };
    }
    return {
      afterLocal: stockLocal + q,
      afterWh: stockWarehouse - q,
    };
  }, [quantity, available, fromLocal, stockLocal, stockWarehouse]);

  const directionSummary = fromLocal
    ? "Local → Bodega · movés desde el mostrador hacia bodega"
    : "Bodega → Local · movés desde bodega al mostrador";

  const cardBase =
    "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";
  const shellMain = `${cardBase} p-6 sm:p-8`;

  const toggleWrap =
    "flex gap-1 rounded-xl border border-zinc-200/90 bg-zinc-100/70 p-1 dark:border-zinc-700 dark:bg-zinc-950/80";
  const toggleActive =
    "flex-1 rounded-lg border border-rose-950 bg-rose-950 px-3 py-3 text-center text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white";
  const toggleIdle =
    "flex-1 rounded-lg px-3 py-3 text-center text-sm font-medium text-zinc-700 transition hover:bg-white/60 dark:text-zinc-400 dark:hover:bg-zinc-800/50";

  return (
    <form
      action={formAction}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-start"
    >
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="return_to" value={returnTo} />

      <div className="space-y-8">
        <section className={shellMain}>
          <div>
            <span className={labelClass}>Producto</span>
            <div className="mt-2 rounded-lg border border-zinc-200/90 bg-white/60 px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100">
              {productName}
            </div>
          </div>

          <div className="mt-8">
            <span className={labelClass}>Stock actual</span>
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-zinc-200/90 bg-white/60 p-4 dark:border-zinc-700 dark:bg-zinc-950/60">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Local</p>
                <p className="mt-1 text-lg font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                  {fmtQty(stockLocal)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Bodega</p>
                <p className="mt-1 text-lg font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                  {fmtQty(stockWarehouse)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <span className={labelClass}>Dirección</span>
            <div className={`mt-2 ${toggleWrap}`}>
              <button
                type="button"
                className={fromLocal ? toggleActive : toggleIdle}
                onClick={() => setDirection("local_to_warehouse")}
              >
                Local → Bodega
              </button>
              <button
                type="button"
                className={!fromLocal ? toggleActive : toggleIdle}
                onClick={() => setDirection("warehouse_to_local")}
              >
                Bodega → Local
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Disponible para mover desde el origen:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{fmtQty(available)} u.</span>
            </p>
          </div>

          <div className="mt-8">
            <label htmlFor="transfer-qty" className={labelClass}>
              Cantidad
            </label>
            <div className="mt-2">
              <ProductQuantityInput
                id="transfer-qty"
                name="quantity"
                value={quantity}
                onChange={setQuantity}
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-10 w-full rounded-xl border border-rose-950 bg-rose-950 py-3.5 text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Transferir
          </button>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-dashed border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/[0.06]">
          <h2 className={sectionTitle}>Operación</h2>
          <p className="mt-4 text-sm text-zinc-900 dark:text-zinc-100">{productName}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{directionSummary}</p>
          {quantity > 0 && quantity <= available ? (
            <div className="mt-5 rounded-xl border border-zinc-200/90 bg-white/60 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/60">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Después del traslado</p>
              <p className="mt-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                Local: <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmtQty(afterLocal)}</span>
                <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
                Bodega:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmtQty(afterWh)}</span>
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Escribe una cantidad válida para ver cómo quedará el stock en local y en bodega.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200/90 bg-white px-5 py-4 text-xs leading-relaxed text-zinc-600 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-none dark:ring-white/[0.06]">
          <ul className="list-disc space-y-2 pl-4 marker:text-zinc-400 dark:marker:text-zinc-500">
            <li>
              El total en listado y en la ficha del producto sigue siendo la suma de local + bodega.
            </li>
            <li>
              Esta acción solo mueve unidades entre los dos depósitos; no crea ni elimina productos.
            </li>
            <li>
              Si usás ubicaciones detalladas en bodega, el total de bodega sigue reflejado en la columna
              agregada.
            </li>
          </ul>
          <p className="mt-4">
            <Link
              href="/admin/products"
              className="font-medium text-zinc-800 underline decoration-zinc-300 dark:text-zinc-200 dark:decoration-zinc-600"
            >
              Cambiar de producto
            </Link>
          </p>
        </div>
      </aside>
    </form>
  );
}
