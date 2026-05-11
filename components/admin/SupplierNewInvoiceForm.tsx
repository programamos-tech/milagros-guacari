"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupplierInvoiceAction } from "@/app/actions/admin/suppliers";
import {
  AdminDateInput,
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import { formatCop, formatCopInputGrouping, parseCopInputDigitsToInt } from "@/lib/money";
import {
  DEFAULT_SUPPLIER_VAT_BPS,
  supplierLineGrossCents,
  supplierLineNetCents,
  supplierLineVatCents,
} from "@/lib/supplier-invoices";

const cardSectionClass =
  "rounded-lg border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 sm:p-4 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

const VAT_RATE_OPTIONS: { label: string; value: number }[] = [
  { label: "19 % (general)", value: 1900 },
  { label: "5 %", value: 500 },
  { label: "8 %", value: 800 },
  { label: "Exento · 0 %", value: 0 },
];

export type SupplierOption = { id: string; name: string };

type ProductHit = {
  id: string;
  name: string;
  reference: string | null;
  price_cents: number;
  cost_cents?: number | null;
};

type CartLine = {
  key: string;
  product: ProductHit;
  quantity: number;
  unitPriceCents: number;
  /** Basis points (1900 = 19 %). Precio unitario = neto sin IVA. */
  vatRateBps: number;
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function defaultUnitCents(p: ProductHit): number {
  const cost = Number(p.cost_cents ?? 0);
  if (Number.isFinite(cost) && cost > 0) return Math.floor(cost);
  return Math.max(0, Math.floor(Number(p.price_cents ?? 0)));
}

function lineNetCents(line: CartLine): number {
  return supplierLineNetCents(line.quantity, line.unitPriceCents);
}

function lineVatCents(line: CartLine): number {
  return supplierLineVatCents(lineNetCents(line), line.vatRateBps);
}

function lineGrossCents(line: CartLine): number {
  return supplierLineGrossCents(lineNetCents(line), line.vatRateBps);
}

export function SupplierNewInvoiceHeader({
  fixedSupplierId,
  supplierName,
}: {
  fixedSupplierId?: string | null;
  supplierName?: string | null;
}) {
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link
            href="/admin/proveedores"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Proveedores
          </Link>
          {fixedSupplierId && supplierName ? (
            <>
              <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
              <Link
                href={`/admin/proveedores/${fixedSupplierId}`}
                className="hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                {supplierName}
              </Link>
            </>
          ) : null}
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nueva factura</span>
        </p>
        <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-xl md:text-2xl">
          {fixedSupplierId && supplierName
            ? `Nueva factura · ${supplierName}`
            : "Nueva factura de proveedor"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-snug text-zinc-500 dark:text-zinc-400">
          Armá la orden con productos del catálogo: el precio unitario es{" "}
          <strong className="font-medium text-zinc-700 dark:text-zinc-300">sin IVA</strong> (podés elegir la tasa por
          ítem). El total incluye IVA; después registrás abonos.
        </p>
      </div>
      <Link
        href={fixedSupplierId ? `/admin/proveedores/${fixedSupplierId}` : "/admin/proveedores"}
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function SupplierNewInvoiceForm({
  issueDateDefault,
  suppliers,
  fixedSupplierId = null,
  fixedSupplierName = null,
}: {
  /** YYYY-MM-DD desde el Server Component para evitar mismatch de hidratación (UTC vs local). */
  issueDateDefault: string;
  suppliers: SupplierOption[];
  fixedSupplierId?: string | null;
  fixedSupplierName?: string | null;
}) {
  const [supplierId, setSupplierId] = useState(
    fixedSupplierId ?? (suppliers[0]?.id ?? ""),
  );
  const [productQuery, setProductQuery] = useState("");
  const debouncedQ = useDebounced(productQuery, 280);
  const [productHits, setProductHits] = useState<ProductHit[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [issueDate, setIssueDate] = useState(issueDateDefault);

  const effectiveSupplierId = fixedSupplierId ?? supplierId;

  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < 1) {
      setProductHits([]);
      return;
    }
    let cancelled = false;
    setProductLoading(true);
    void fetch(`/api/admin/products-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j: { products?: ProductHit[] }) => {
        if (!cancelled) setProductHits(j.products ?? []);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const invoiceTotals = useMemo(() => {
    let net = 0;
    let gross = 0;
    for (const l of lines) {
      const n = supplierLineNetCents(l.quantity, l.unitPriceCents);
      net += n;
      gross += supplierLineGrossCents(n, l.vatRateBps);
    }
    return { netCents: net, vatCents: gross - net, grossCents: gross };
  }, [lines]);

  const payloadJson = useMemo(
    () =>
      JSON.stringify({
        lines: lines.map((l) => ({
          productId: l.product.id,
          productName: l.product.name,
          quantity: Math.max(1, Math.floor(l.quantity)),
          unitPriceCents: Math.max(0, Math.floor(l.unitPriceCents)),
          vatRateBps: Math.max(0, Math.min(10000, Math.floor(l.vatRateBps))),
        })),
      }),
    [lines],
  );

  const canSubmit =
    effectiveSupplierId.length > 0 && lines.length > 0 && invoiceTotals.grossCents > 0;

  function addProduct(p: ProductHit) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.product.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          product: p,
          quantity: 1,
          unitPriceCents: defaultUnitCents(p),
          vatRateBps: DEFAULT_SUPPLIER_VAT_BPS,
        },
      ];
    });
    setProductQuery("");
    setProductHits([]);
  }

  function updateLine(
    key: string,
    patch: Partial<Pick<CartLine, "quantity" | "unitPriceCents" | "vatRateBps">>,
  ) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  return (
    <form action={createSupplierInvoiceAction} className="space-y-4">
      <input type="hidden" name="supplier_id" value={effectiveSupplierId} />
      <input type="hidden" name="payload" value={payloadJson} readOnly />
      <input
        type="hidden"
        name="form_context"
        value={fixedSupplierId ? "supplier" : "hub"}
        readOnly
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4 lg:col-span-2">
          <section className={cardSectionClass}>
            <h2 className={sectionTitle}>Proveedor y emisión</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {fixedSupplierId ? (
                <div className="sm:col-span-2">
                  <p className={labelClass}>Proveedor</p>
                  <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {fixedSupplierName ?? "—"}
                  </p>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="sin-supplier" className={labelClass}>
                    Proveedor <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <select
                    id="sin-supplier"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Seleccionar…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="sin-issue" className={labelClass}>
                  Fecha de emisión <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="mt-1.5">
                  <AdminDateInput
                    id="sin-issue"
                    name="issue_date"
                    value={issueDate}
                    onChange={setIssueDate}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={cardSectionClass}>
            <h2 className={sectionTitle}>Buscar productos</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-snug text-zinc-500 dark:text-zinc-400">
              Escribí nombre o referencia del producto del catálogo. El precio sugerido es el{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-300">costo</strong> (o lista si no hay
              costo), <strong className="font-medium text-zinc-700 dark:text-zinc-300">sin IVA</strong>; elegís la
              tasa por ítem (por defecto 19 %).
            </p>
            <div className="relative mt-3">
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Nombre o código…"
                autoComplete="off"
                className={inputClass}
              />
              {productQuery.trim().length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40">
                  {productLoading ? (
                    <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Buscando…</p>
                  ) : productHits.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Sin resultados.</p>
                  ) : (
                    productHits.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/90"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {p.reference ? `${p.reference} · ` : null}
                          {formatCop(defaultUnitCents(p))} sugerido
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section className={cardSectionClass}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className={sectionTitle}>Productos de la orden</h2>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {lines.length === 0 ? "Sin ítems" : `${lines.length} ítem${lines.length === 1 ? "" : "s"}`}
              </span>
            </div>
            {lines.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Agregá al menos un producto para generar la factura y el total.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {lines.map((line) => {
                  const net = lineNetCents(line);
                  const vat = lineVatCents(line);
                  const gross = lineGrossCents(line);
                  return (
                    <li
                      key={line.key}
                      className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/50 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{line.product.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {line.product.reference ? `Ref. ${line.product.reference}` : line.product.id}
                        </p>
                        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                          <div>
                            <label className={labelClass}>Cantidad</label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Precio unit. sin IVA (COP)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={
                                line.unitPriceCents <= 0
                                  ? ""
                                  : formatCopInputGrouping(line.unitPriceCents)
                              }
                              onChange={(e) => {
                                const n = parseCopInputDigitsToInt(e.target.value);
                                updateLine(line.key, { unitPriceCents: n });
                              }}
                              className={inputClass}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className={labelClass}>IVA</label>
                            <select
                              value={line.vatRateBps}
                              onChange={(e) =>
                                updateLine(line.key, { vatRateBps: Number(e.target.value) })
                              }
                              className={inputClass}
                            >
                              {VAT_RATE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                          Neto {formatCop(net)}
                          {vat > 0 ? (
                            <>
                              {" "}
                              · IVA {formatCop(vat)}
                            </>
                          ) : null}{" "}
                          ·{" "}
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Total {formatCop(gross)}
                          </span>
                        </p>
                      </div>
                      <div className="mt-2 flex shrink-0 items-center justify-between gap-2 sm:mt-0 sm:flex-col sm:items-end">
                        <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatCop(gross)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={cardSectionClass}>
            <h2 className={sectionTitle}>Notas</h2>
            <textarea
              name="notes"
              rows={3}
              placeholder="Referencia de OC del proveedor, condiciones, etc."
              className={`${inputClass} mt-3`}
            />
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-16 lg:col-span-1 lg:self-start">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none">
            <h2 className={sectionTitle}>Resumen</h2>
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/80">
              <dl className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Proveedor</dt>
                  <dd className="max-w-[55%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {fixedSupplierName ??
                      suppliers.find((s) => s.id === supplierId)?.name ??
                      "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/90">
                  <dt className="text-zinc-500 dark:text-zinc-400">Ítems</dt>
                  <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{lines.length}</dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/90">
                  <dt className="text-zinc-500 dark:text-zinc-400">Subtotal sin IVA</dt>
                  <dd className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCop(invoiceTotals.netCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">IVA</dt>
                  <dd className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCop(invoiceTotals.vatCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-1.5 dark:border-zinc-700/90">
                  <dt className="text-zinc-500 dark:text-zinc-400">Total estimado</dt>
                  <dd className="text-right text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCop(invoiceTotals.grossCents)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                El total guardado es la suma de cada línea (neto + IVA según la tasa elegida). Los precios unitarios
                son sin IVA.
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-4 w-full rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              Crear factura
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
