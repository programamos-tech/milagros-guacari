"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AdminDateInput,
  ProductMoneyInput,
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import type { FragranceRowInitial } from "@/components/admin/ProductFragranceRows";
import type { ProductCategoryOption } from "@/components/admin/NewProductForm";
import { formatCop } from "@/lib/money";
import {
  assertProductImageSize,
  blockSubmitIfImageTooLarge,
  MAX_PRODUCT_IMAGE_BYTES,
} from "@/lib/product-image-upload";
import { SALE_VAT_PERCENT } from "@/lib/product-vat-price";
import { shouldUnoptimizeStorageImageUrl } from "@/lib/storage-public-url";
import { ProductFragranceRows } from "@/components/admin/ProductFragranceRows";
import {
  ProductSizeRows,
  type SizeRowState,
} from "@/components/admin/ProductSizeRows";
import { PRODUCT_COLOR_OPTIONS, productColorSwatchClass } from "@/lib/product-colors";

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

const summaryInset =
  "mt-4 rounded-lg border border-zinc-200/90 bg-white/60 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950/60";

type Initial = {
  name: string;
  reference: string;
  description: string;
  brand: string;
  categoryId: string;
  priceCents: number;
  costCents: number;
  costGrossCents: number;
  stockLocal: number;
  stockWarehouse: number;
  isPublished: boolean;
  sizeRows: SizeRowState[];
  hasExpiration: boolean;
  expirationDate: string;
  hasVat: boolean;
  vatPercent: number | null;
  colors: string[];
  fragranceRows: FragranceRowInitial[];
};

type Props = {
  formAction: (formData: FormData) => void;
  categories: ProductCategoryOption[];
  initial: Initial;
  currentImageUrl: string | null;
};

export function EditProductForm({
  formAction,
  categories,
  initial,
  currentImageUrl,
}: Props) {
  const [name, setName] = useState(initial.name);
  const [reference, setReference] = useState(initial.reference);
  const [description, setDescription] = useState(initial.description);
  const [brand, setBrand] = useState(initial.brand);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [costCents, setCostCents] = useState(initial.costCents);
  const [costGrossCents, setCostGrossCents] = useState(initial.costGrossCents);
  const [priceCents, setPriceCents] = useState(initial.priceCents);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [hasExpiration, setHasExpiration] = useState(initial.hasExpiration);
  const [expirationDate, setExpirationDate] = useState(initial.expirationDate);
  const [hasVat, setHasVat] = useState(initial.hasVat);
  const [selectedColors, setSelectedColors] = useState(initial.colors);
  const [fileLabel, setFileLabel] = useState("Ningún archivo seleccionado");

  const categoryLabel =
    categories.find((c) => c.id === categoryId)?.name ?? "—";

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(e) => {
        if (blockSubmitIfImageTooLarge(e.currentTarget)) {
          e.preventDefault();
        }
      }}
    >
      <input
        type="hidden"
        name="stock_local"
        value={String(initial.stockLocal)}
      />
      <input
        type="hidden"
        name="stock_warehouse"
        value={String(initial.stockWarehouse)}
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <section className={cardClass}>
            <h2 className={sectionTitle}>Información básica</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="ep-name" className={labelClass}>
                  Nombre del producto <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="ep-name"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ep-ref" className={labelClass}>
                  Referencia <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="ep-ref"
                  name="reference"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ep-desc" className={labelClass}>
                  Descripción (opcional)
                </label>
                <textarea
                  id="ep-desc"
                  name="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <span className={labelClass}>Imagen (catálogo en línea)</span>
                <div className="flex flex-wrap items-start gap-4">
                  {currentImageUrl ? (
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-100/60 dark:border-zinc-700 dark:bg-zinc-950">
                      <Image
                        src={currentImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized={shouldUnoptimizeStorageImageUrl(
                          currentImageUrl,
                        )}
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer">
                        <span className="rounded-lg border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
                          Seleccionar archivo
                        </span>
                        <input
                          name="image"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            const msg = assertProductImageSize(f ?? undefined);
                            if (msg) {
                              alert(msg);
                              e.target.value = "";
                              setFileLabel("Ningún archivo seleccionado");
                              return;
                            }
                            setFileLabel(f ? f.name : "Ningún archivo seleccionado");
                          }}
                        />
                      </label>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{fileLabel}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      JPG, PNG o WebP. Máx. {MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ep-brand" className={labelClass}>
                    Marca (opcional)
                  </label>
                  <input
                    id="ep-brand"
                    name="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ep-cat" className={labelClass}>
                    Categoría (opcional)
                  </label>
                  <select
                    id="ep-cat"
                    name="category_id"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ProductSizeRows initialRows={initial.sizeRows} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Colores (opcional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_COLOR_OPTIONS.map((color) => {
                      const checked = selectedColors.includes(color);
                      return (
                        <label
                          key={color}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                            checked
                              ? "border-[#3d5240] bg-[#eef3ee] text-[#3d5240] dark:border-emerald-700/80 dark:bg-emerald-950/45 dark:text-emerald-100"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-500"
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="colors"
                            value={color}
                            checked={checked}
                            onChange={(e) =>
                              setSelectedColors((prev) =>
                                e.target.checked
                                  ? [...prev, color]
                                  : prev.filter((c) => c !== color),
                              )
                            }
                            className="sr-only"
                          />
                          <span className={`size-3 rounded-full ${productColorSwatchClass(color)}`} />
                          {color}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <ProductFragranceRows initialRows={initial.fragranceRows} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    name="has_expiration"
                    checked={hasExpiration}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setHasExpiration(next);
                      if (!next) setExpirationDate("");
                    }}
                    className="rounded border-zinc-300 accent-zinc-900 focus:ring-zinc-200/80 dark:border-zinc-600 dark:accent-zinc-100 dark:focus:ring-zinc-600/40"
                  />
                  Tiene fecha de vencimiento
                </label>
                <div className={!hasExpiration ? "pointer-events-none opacity-60" : ""}>
                  <label htmlFor="ep-expiration" className={labelClass}>
                    Fecha de vencimiento
                  </label>
                  <AdminDateInput
                    id="ep-expiration"
                    name="expiration_date"
                    value={expirationDate}
                    onChange={setExpirationDate}
                    required={false}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    name="has_vat"
                    value="on"
                    checked={hasVat}
                    onChange={(e) => {
                      setHasVat(e.target.checked);
                    }}
                    className="rounded border-zinc-300 accent-zinc-900 focus:ring-zinc-200/80 dark:border-zinc-600 dark:accent-zinc-100 dark:focus:ring-zinc-600/40"
                  />
                  Maneja IVA
                </label>
                <div className={!hasVat ? "pointer-events-none opacity-60" : ""}>
                  <p className={`${labelClass} normal-case tracking-normal`}>
                    IVA sobre precio de venta
                  </p>
                  <p className="mt-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {SALE_VAT_PERCENT} %
                    </span>{" "}
                    (tipo general Colombia). El precio de venta que cargás es la base{" "}
                    <span className="font-medium">sin IVA</span>; el total al público se calcula
                    con ese porcentaje.
                  </p>
                  {hasVat ? (
                    <input type="hidden" name="vat_percent" value={String(SALE_VAT_PERCENT)} />
                  ) : null}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  name="is_published"
                  value="on"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-zinc-300 accent-zinc-900 focus:ring-zinc-200/80 dark:border-zinc-600 dark:accent-zinc-100 dark:focus:ring-zinc-600/40"
                />
                Publicado en la tienda
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <section className={cardClass}>
            <h2 className={sectionTitle}>Información financiera</h2>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Costo (sin IVA) <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <ProductMoneyInput
                    name="cost_cents"
                    value={costCents}
                    onChange={setCostCents}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Costo con IVA
                  </label>
                  <ProductMoneyInput
                    name="cost_gross_cents"
                    value={costGrossCents}
                    onChange={setCostGrossCents}
                    required={false}
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                    Bruto en factura del proveedor. Reportes de stock con IVA.
                  </p>
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Precio de venta <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <ProductMoneyInput
                  name="price_cents"
                  value={priceCents}
                  onChange={setPriceCents}
                  required
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Este producto no podrá ser vendido por menos del valor de precio de venta.
              </p>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className={sectionTitle}>Resumen del producto</h2>
            <div className={summaryInset}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                Producto
              </p>
              <dl className="mt-3 space-y-2 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Nombre</dt>
                  <dd className="max-w-[60%] truncate text-right text-zinc-900 dark:text-zinc-100">
                    {name.trim() || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Referencia</dt>
                  <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                    {reference.trim() || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Categoría</dt>
                  <dd className="max-w-[55%] truncate text-right text-zinc-800 dark:text-zinc-100">
                    {categoryLabel}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 border-t border-zinc-200/70 pt-5 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Precio de venta</p>
              <p className="mt-1 text-2xl font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCop(priceCents)}
              </p>
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-zinc-200/70 pt-4 text-sm dark:border-zinc-800">
              <li className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Costo sin IVA</span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCop(costCents)}
                </span>
              </li>
              <li className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Costo con IVA</span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCop(costGrossCents)}
                </span>
              </li>
              <li className="flex justify-between font-medium text-zinc-900 dark:text-zinc-100">
                <span>Precio venta</span>
                <span className="tabular-nums">{formatCop(priceCents)}</span>
              </li>
            </ul>

            <p className="mt-5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Guardar cambios
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Se actualizarán los datos del producto en el catálogo. El stock se ajusta desde{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Inventario</span> con
              Actualizar stock.
            </p>

            <button
              type="submit"
              className="mt-4 w-full rounded-lg border border-rose-950 bg-rose-950 py-3.5 text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              Guardar cambios
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
