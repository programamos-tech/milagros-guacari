"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  productInputClass,
  productLabelClass,
} from "@/components/admin/product-form-primitives";
import { SIZE_UNITS, type SizeUnit } from "@/lib/product-size-options";

export type SizeRowState = { value: string; unit: SizeUnit };

type Props = {
  initialRows: SizeRowState[];
};

export function ProductSizeRows({ initialRows }: Props) {
  const [rows, setRows] = useState<SizeRowState[]>(() =>
    initialRows.length > 0 ? initialRows : [{ value: "", unit: "ml" }],
  );

  const add = () => setRows((prev) => [...prev, { value: "", unit: "ml" }]);
  const remove = (i: number) =>
    setRows((prev) =>
      prev.length <= 1
        ? [{ value: "", unit: "ml" }]
        : prev.filter((_, j) => j !== i),
    );

  return (
    <div>
      <span className={productLabelClass}>Tamaños / presentaciones (opcional)</span>
      <div className="mt-2 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              name="size_option_value"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={row.value}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, j) =>
                    j === i ? { ...r, value: e.target.value } : r,
                  ),
                )
              }
              placeholder="177"
              className={`${productInputClass} min-w-0 sm:max-w-[8rem]`}
            />
            <select
              name="size_option_unit"
              value={row.unit}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, j) =>
                    j === i
                      ? { ...r, unit: e.target.value as SizeUnit }
                      : r,
                  ),
                )
              }
              className={`${productInputClass} w-full shrink-0 sm:w-36`}
            >
              {SIZE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              aria-label="Quitar tamaño"
            >
              <Trash2 className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        Añadir tamaño
      </button>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Podés cargar varias presentaciones (ej. 177 ml y 400 ml). La primera fila
        también actualiza el tamaño que usa el filtro del catálogo cuando aplica.
      </p>
    </div>
  );
}
