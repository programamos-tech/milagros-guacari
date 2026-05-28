"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createKitAction,
  previewKitMarginAction,
  updateKitAction,
} from "@/app/actions/admin/kits";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import { formatCop, parseCopInputDigitsToInt } from "@/lib/money";
import {
  assertProductImageSize,
  MAX_PRODUCT_IMAGE_BYTES,
} from "@/lib/product-image-upload";
import type { KitPricingMode, ProductKitRow } from "@/lib/product-kits";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

type ProductHit = {
  id: string;
  name: string;
  reference: string | null;
  price_cents: number;
  stock_local?: number | null;
};

type KitItemState = { productId: string; quantity: number; product: ProductHit };

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

const cardClass =
  "rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 sm:p-6 dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-white/[0.06]";

export function KitForm({
  mode,
  kit,
  canEdit,
}: {
  mode: "create" | "edit";
  kit?: ProductKitRow;
  canEdit: boolean;
}) {
  const [name, setName] = useState(kit?.name ?? "");
  const [description, setDescription] = useState(kit?.description ?? "");
  const [isPublished, setIsPublished] = useState(kit?.is_published ?? false);
  const [pricingMode, setPricingMode] = useState<KitPricingMode>(
    kit?.pricing_mode ?? "sum_discount",
  );
  const [discountPercent, setDiscountPercent] = useState(
    String(kit?.discount_percent ?? 10),
  );
  const [priceRaw, setPriceRaw] = useState(
    kit?.pricing_mode === "fixed" ? String(kit.price_cents ?? 0) : "",
  );
  const [sortOrder, setSortOrder] = useState(String(kit?.sort_order ?? 0));
  const [fileLabel, setFileLabel] = useState("Ningún archivo seleccionado");
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [items, setItems] = useState<KitItemState[]>(() =>
    (kit?.items ?? []).map((row) => {
      const p = row.products;
      return {
        productId: String(row.product_id),
        quantity: Math.max(1, Number(row.quantity ?? 1)),
        product: {
          id: String(row.product_id),
          name: p?.name ?? "Producto",
          reference: p?.reference ?? null,
          price_cents: Number(p?.price_cents ?? 0),
          stock_local: p?.stock_local,
        },
      };
    }),
  );
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q.trim(), 280);
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [margin, setMargin] = useState<{
    sumGrossCents: number;
    costCents: number;
    saleCents: number;
    marginCents: number;
    marginPercent: number | null;
    maxPosKits: number;
  } | null>(null);

  const itemsJson = useMemo(
    () => JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity }))),
    [items],
  );

  const priceCents =
    pricingMode === "fixed"
      ? parseCopInputDigitsToInt(priceRaw)
      : 0;
  const discountNum = Math.min(100, Math.max(0, Math.floor(Number(discountPercent) || 0)));

  useEffect(() => {
    if (!canEdit || items.length === 0) {
      setMargin(null);
      return;
    }
    let cancelled = false;
    void previewKitMarginAction({
      pricingMode,
      discountPercent: discountNum,
      priceCents,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    }).then((m) => {
      if (!cancelled) setMargin(m);
    });
    return () => {
      cancelled = true;
    };
  }, [canEdit, items, pricingMode, discountNum, priceCents]);

  useEffect(() => {
    if (debouncedQ.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/admin/products-search?q=${encodeURIComponent(debouncedQ)}`)
      .then(async (r) => {
        if (!r.ok) return { products: [] as ProductHit[] };
        return r.json() as Promise<{ products?: ProductHit[] }>;
      })
      .then((j) => {
        if (!cancelled) setHits(j.products ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  function addProduct(p: ProductHit) {
    if (items.some((i) => i.productId === p.id)) return;
    setItems((prev) => [...prev, { productId: p.id, quantity: 1, product: p }]);
    setQ("");
    setHits([]);
  }

  const existingImageUrl = kit?.image_path
    ? storagePublicObjectUrl(kit.image_path)
    : null;
  const displayPreview = newImagePreview ?? existingImageUrl;

  useEffect(() => {
    return () => {
      if (newImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, [newImagePreview]);

  return (
    <form
      action={mode === "create" ? createKitAction : updateKitAction}
      encType="multipart/form-data"
      className="space-y-6"
    >
      {mode === "edit" && kit ? (
        <input type="hidden" name="kit_id" value={kit.id} />
      ) : null}
      <input type="hidden" name="kit_items_json" value={itemsJson} />
      <input type="hidden" name="price_cents" value={String(priceCents)} />

      <section className={cardClass}>
        <h2 className={sectionTitle}>Datos del kit</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Nombre</span>
            <input
              name="name"
              required
              disabled={!canEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Descripción</span>
            <textarea
              name="description"
              rows={3}
              disabled={!canEdit}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Orden en el catálogo</span>
            <input
              name="sort_order"
              type="number"
              min={0}
              disabled={!canEdit}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
              className={`${inputClass} max-w-[8rem]`}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Número para ordenar los kits en la tienda:{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-300">0</strong> aparece
              primero, luego 1, 2… Si solo tenés un kit, dejá{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-300">0</strong>.
            </p>
          </label>
          <label className="flex items-start gap-2 pt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
            <input
              type="checkbox"
              name="is_published"
              value="on"
              disabled={!canEdit}
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="mt-0.5 size-4 rounded border-zinc-300"
            />
            <span>
              Publicado en tienda y ventas
              <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                Si no está marcado, el kit queda en borrador y no se vende en la web ni en POS.
              </span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <span className={labelClass}>Imagen del kit</span>
            <div className="mt-2 flex flex-wrap items-start gap-4">
              {canEdit ? (
                <input
                  id="kit-image-file"
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
                      setNewImagePreview((prev) => {
                        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                        return null;
                      });
                      return;
                    }
                    setFileLabel(f ? f.name : "Ningún archivo seleccionado");
                    setNewImagePreview((prev) => {
                      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                      return f ? URL.createObjectURL(f) : null;
                    });
                  }}
                />
              ) : null}
              {canEdit ? (
                <label
                  htmlFor="kit-image-file"
                  className="group relative block size-32 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 transition hover:border-zinc-400 hover:bg-zinc-100/80 dark:border-zinc-600 dark:bg-zinc-950/50 dark:hover:border-zinc-500"
                >
                  {displayPreview ? (
                    <Image
                      src={displayPreview}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="128px"
                      unoptimized={
                        displayPreview.startsWith("blob:") ||
                        shouldUnoptimizeStorageImageUrl(displayPreview)
                      }
                    />
                  ) : (
                    <span className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-[11px] font-medium leading-snug text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                      <span className="text-2xl leading-none text-zinc-400" aria-hidden>
                        +
                      </span>
                      Clic para subir foto
                    </span>
                  )}
                </label>
              ) : displayPreview ? (
                <div className="relative size-32 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={displayPreview}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized={shouldUnoptimizeStorageImageUrl(displayPreview)}
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                {canEdit ? (
                  <>
                    <label
                      htmlFor="kit-image-file"
                      className="inline-flex cursor-pointer rounded-lg border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      Seleccionar archivo
                    </label>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{fileLabel}</p>
                  </>
                ) : null}
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  JPG, PNG o WebP. Máx. {MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB. Se muestra en{" "}
                  <strong>/kits</strong> y en la bolsa de compras.
                </p>
                {canEdit && existingImageUrl && !newImagePreview ? (
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      name="remove_image"
                      value="on"
                      className="size-4 rounded border-zinc-300"
                    />
                    Quitar imagen actual
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className={sectionTitle}>Precio y margen</h2>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="pricing_mode"
                value="sum_discount"
                disabled={!canEdit}
                checked={pricingMode === "sum_discount"}
                onChange={() => setPricingMode("sum_discount")}
              />
              Descuento sobre suma de productos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="pricing_mode"
                value="fixed"
                disabled={!canEdit}
                checked={pricingMode === "fixed"}
                onChange={() => setPricingMode("fixed")}
              />
              Precio fijo del kit
            </label>
          </div>
          {pricingMode === "sum_discount" ? (
            <label className="block max-w-xs">
              <span className={labelClass}>Descuento del kit (%)</span>
              <input
                name="discount_percent"
                type="number"
                min={0}
                max={100}
                disabled={!canEdit}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className={inputClass}
              />
            </label>
          ) : (
            <label className="block max-w-xs">
              <span className={labelClass}>Precio fijo (COP)</span>
              <input
                type="text"
                inputMode="numeric"
                disabled={!canEdit}
                value={priceRaw}
                onChange={(e) => setPriceRaw(e.target.value.replace(/\D/g, ""))}
                className={inputClass}
                placeholder="Ej. 150000"
              />
            </label>
          )}
          {margin ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950/50">
              <p>
                Suma catálogo: <strong>{formatCop(margin.sumGrossCents)}</strong>
              </p>
              <p className="mt-1">
                Costo componentes: <strong>{formatCop(margin.costCents)}</strong>
              </p>
              <p className="mt-1">
                Precio venta kit: <strong>{formatCop(margin.saleCents)}</strong>
              </p>
              <p
                className={`mt-1 font-semibold ${
                  margin.marginCents < 0 ? "text-red-700" : "text-emerald-800"
                }`}
              >
                Margen: {formatCop(margin.marginCents)}
                {margin.marginPercent != null ? ` (${margin.marginPercent}%)` : ""}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Kits armables con stock en tienda (POS):{" "}
                <strong>{margin.maxPosKits}</strong>
              </p>
              {margin.marginCents < 0 ? (
                <p className="mt-2 text-xs text-red-700">
                  El precio del kit está por debajo del costo. Ajustá el descuento o el precio fijo.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className={cardClass}>
        <h2 className={sectionTitle}>Productos del kit</h2>
        {canEdit ? (
          <div className="mt-4">
            <label className={labelClass}>Agregar producto</label>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o referencia…"
              className={inputClass}
            />
            {hits.length > 0 ? (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                {hits.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span>
                        {p.name}
                        {p.reference ? (
                          <span className="ml-1 font-mono text-xs text-zinc-400">
                            ({p.reference})
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-zinc-500">
                        Stock tienda: {p.stock_local ?? "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <ul className="mt-4 space-y-2">
          {items.map((it) => (
            <li
              key={it.productId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm font-medium">
                {it.product.name}
                {it.product.reference ? ` (${it.product.reference})` : ""}
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">
                  Cant.
                  <input
                    type="number"
                    min={1}
                    disabled={!canEdit}
                    value={it.quantity}
                    onChange={(e) => {
                      const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                      setItems((prev) =>
                        prev.map((row) =>
                          row.productId === it.productId ? { ...row, quantity: n } : row,
                        ),
                      );
                    }}
                    className="ml-1 w-16 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  />
                </label>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((r) => r.productId !== it.productId))
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Agregá al menos un producto al kit.</p>
        ) : null}
      </section>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={items.length === 0 || name.trim().length < 2}
            className="rounded-lg border border-rose-950 bg-rose-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:border-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {mode === "create" ? "Crear kit" : "Guardar cambios"}
          </button>
          {items.length === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Agregá al menos un producto al kit para poder guardar.
            </p>
          ) : null}
          <Link
            href="/admin/kits"
            className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
          >
            Cancelar
          </Link>
        </div>
      ) : null}
    </form>
  );
}
