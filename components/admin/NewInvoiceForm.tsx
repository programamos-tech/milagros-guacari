"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { createQuickStoreCustomer } from "@/app/actions/admin/store-customers";
import { createPosInvoiceAction } from "@/app/actions/admin/pos-invoice";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import { formatCop, parseCopInputDigitsToInt } from "@/lib/money";
import {
  parseStoreCustomerKind,
  unitPriceAfterWholesaleCents,
  wholesaleDiscountPercentFromRow,
} from "@/lib/customer-wholesale-pricing";
import {
  applyPosLineNetDiscountCents,
  discountedUnitNetCentsFromLine,
} from "@/lib/pos-line-discount";
import { saleVatPercentLabel, unitPriceGrossCents } from "@/lib/product-vat-price";

const cardSectionClass =
  "rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 sm:p-6 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

type ProductHit = {
  id: string;
  name: string;
  reference: string | null;
  price_cents: number;
  stock_quantity?: number | null;
  stock_local?: number | null;
  has_vat?: boolean | null;
  vat_percent?: number | null;
};

type CustomerHit = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document_id: string | null;
};

type ShipOption =
  | { kind: "pickup"; id: "pickup"; label: string; detail: string }
  | { kind: "address"; id: string; label: string; detail: string };

type LineDiscountMode = "none" | "percent" | "amount";

type CartLine = {
  key: string;
  product: ProductHit;
  quantity: number;
  discountMode: LineDiscountMode;
  discountPercent: number;
  /** Dígitos COP (como efectivo) para descuento fijo sobre neto de línea. */
  discountAmountRaw: string;
};

function lineBaseCents(line: CartLine, wholesalePct: number): number {
  const net = unitPriceAfterWholesaleCents(
    Number(line.product.price_cents ?? 0),
    wholesalePct,
  );
  return net * line.quantity;
}

function unitFinalCents(product: ProductHit, wholesalePct: number): number {
  const net = unitPriceAfterWholesaleCents(
    Number(product.price_cents ?? 0),
    wholesalePct,
  );
  return unitPriceGrossCents(net, product.has_vat, product.vat_percent);
}

function lineNetBeforeDiscount(line: CartLine, wholesalePct: number): number {
  return lineBaseCents(line, wholesalePct);
}

function effectiveLineDiscountPercent(line: CartLine): number | null {
  if (line.discountMode !== "percent") return null;
  const p = Math.floor(line.discountPercent);
  return p > 0 && p <= 100 ? p : null;
}

function effectiveLineDiscountAmountCents(line: CartLine, wholesalePct: number): number {
  if (line.discountMode !== "amount") return 0;
  const raw = parseCopInputDigitsToInt(line.discountAmountRaw);
  const maxNet = lineNetBeforeDiscount(line, wholesalePct);
  return Math.min(Math.max(0, raw), maxNet);
}

function lineNetAfterDiscount(line: CartLine, wholesalePct: number): number {
  return applyPosLineNetDiscountCents(
    lineNetBeforeDiscount(line, wholesalePct),
    effectiveLineDiscountPercent(line),
    effectiveLineDiscountAmountCents(line, wholesalePct),
  );
}

function discountedUnitNetCents(line: CartLine, wholesalePct: number): number {
  return discountedUnitNetCentsFromLine(
    lineNetAfterDiscount(line, wholesalePct),
    line.quantity,
  );
}

function lineUnitGrossAfterDiscount(line: CartLine, wholesalePct: number): number {
  const du = discountedUnitNetCents(line, wholesalePct);
  return unitPriceGrossCents(du, line.product.has_vat, line.product.vat_percent);
}

function lineVatCents(line: CartLine, wholesalePct: number): number {
  const du = discountedUnitNetCents(line, wholesalePct);
  const ug = lineUnitGrossAfterDiscount(line, wholesalePct);
  return (ug - du) * line.quantity;
}

type PaymentTab = "cash" | "transfer" | "mixed";

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10h5M9.5 14h5" strokeLinecap="round" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function NewInvoiceHeader() {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link
            href="/admin/ventas"
            className="hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Ventas
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nueva factura</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Nueva factura
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Selecciona el cliente, agrega productos al carrito y elige el método de pago.
        </p>
      </div>
      <Link
        href="/admin/ventas"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver a ventas"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "validation":
      return "Revisa cliente, productos y cantidades.";
    case "customer":
      return "No se encontró el cliente.";
    case "products":
      return "Algún producto no es válido o ya no existe.";
    case "stock":
      return "Stock insuficiente en tienda para uno o más productos.";
    case "db":
      return "No se pudo guardar. Aplica en Supabase las migraciones POS (escritura admin y columnas de descuento en order_items) e intenta de nuevo.";
    default:
      return "Ocurrió un error al confirmar la factura.";
  }
}

function ConfirmInvoiceButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-5 w-full rounded-lg border border-rose-950 bg-rose-950 py-3.5 text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:border-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
    >
      {pending ? "Guardando…" : "Confirmar factura"}
    </button>
  );
}

export function NewInvoiceForm({ initialError }: { initialError?: string }) {
  const quickNameInputRef = useRef<HTMLInputElement>(null);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickDocument, setQuickDocument] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickPending, setQuickPending] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const debouncedProductQ = useDebounced(productQuery, 280);
  const [productHits, setProductHits] = useState<ProductHit[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [customerQuery, setCustomerQuery] = useState("");
  const debouncedCustomerQ = useDebounced(customerQuery, 280);
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [customerWholesalePct, setCustomerWholesalePct] = useState(0);
  const [posCustomerKind, setPosCustomerKind] = useState<"retail" | "wholesale">("retail");
  const [shipOptions, setShipOptions] = useState<ShipOption[]>([]);
  const [shipChoice, setShipChoice] = useState<string | null>(null);
  const [shipLoading, setShipLoading] = useState(false);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentTab>("cash");
  const [cashGivenRaw, setCashGivenRaw] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [mixedCashRaw, setMixedCashRaw] = useState("");
  const [mixedTransferRaw, setMixedTransferRaw] = useState("");

  const closeQuickCustomerModal = useCallback(() => {
    setQuickModalOpen(false);
    setQuickError(null);
    setQuickName("");
    setQuickDocument("");
  }, []);

  const loadCustomerProfile = useCallback(async (id: string) => {
    setShipLoading(true);
    setShipChoice(null);
    try {
      const res = await fetch(`/api/admin/customers/${id}/pos-profile`);
      if (!res.ok) {
        setShipOptions([]);
        setCustomerWholesalePct(0);
        setPosCustomerKind("retail");
        return;
      }
      const json = (await res.json()) as {
        shipOptions?: ShipOption[];
        customer?: {
          customer_kind?: string | null;
          wholesale_discount_percent?: number | null;
        };
      };
      setShipOptions(json.shipOptions ?? []);
      setPosCustomerKind(parseStoreCustomerKind(json.customer?.customer_kind));
      setCustomerWholesalePct(
        wholesaleDiscountPercentFromRow(json.customer ?? {}),
      );
    } finally {
      setShipLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer) {
      void loadCustomerProfile(customer.id);
    } else {
      setShipOptions([]);
      setShipChoice(null);
      setPosCustomerKind("retail");
      setCustomerWholesalePct(0);
    }
  }, [customer, loadCustomerProfile]);

  useEffect(() => {
    if (!customer || shipOptions.length === 0) return;
    setShipChoice((cur) =>
      cur && shipOptions.some((o) => o.id === cur) ? cur : shipOptions[0]!.id,
    );
  }, [customer, shipOptions]);

  useEffect(() => {
    if (!quickModalOpen) return;
    const t = window.setTimeout(() => quickNameInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [quickModalOpen]);

  useEffect(() => {
    if (!quickModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeQuickCustomerModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickModalOpen, closeQuickCustomerModal]);

  async function submitQuickCustomer(e: React.FormEvent) {
    e.preventDefault();
    setQuickError(null);
    setQuickPending(true);
    const res = await createQuickStoreCustomer({
      name: quickName,
      document_id: quickDocument,
    });
    setQuickPending(false);
    if (!res.ok) {
      if (res.code === "auth") {
        setQuickError("Sesión expirada. Recarga la página e inicia sesión de nuevo.");
      } else if (res.code === "forbidden") {
        setQuickError("No tenés permiso para crear clientes.");
      } else if (res.code === "name") {
        setQuickError("El nombre es obligatorio.");
      } else {
        setQuickError("No se pudo crear el cliente. Intenta de nuevo.");
      }
      return;
    }
    setCustomer({
      id: res.customer.id,
      name: res.customer.name,
      email: res.customer.email,
      phone: res.customer.phone,
      document_id: res.customer.document_id,
    });
    setCustomerQuery("");
    setCustomerHits([]);
    closeQuickCustomerModal();
  }

  useEffect(() => {
    const q = debouncedProductQ.trim();
    if (q.length < 1) {
      setProductHits([]);
      return;
    }
    let cancelled = false;
    setProductLoading(true);
    void fetch(`/api/admin/products-search?q=${encodeURIComponent(q)}`)
      .then(async (r) => {
        if (!r.ok) return { products: [] as ProductHit[] };
        return r.json() as Promise<{ products?: ProductHit[] }>;
      })
      .then((j) => {
        if (!cancelled) setProductHits(j.products ?? []);
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedProductQ]);

  useEffect(() => {
    const q = debouncedCustomerQ.trim();
    if (q.length < 1) {
      setCustomerHits([]);
      return;
    }
    let cancelled = false;
    setCustomerLoading(true);
    void fetch(`/api/admin/customers-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j: { customers?: CustomerHit[] }) => {
        if (!cancelled) setCustomerHits(j.customers ?? []);
      })
      .finally(() => {
        if (!cancelled) setCustomerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedCustomerQ]);

  const subtotalCents = useMemo(() => {
    let s = 0;
    for (const line of lines) {
      s += lineNetAfterDiscount(line, customerWholesalePct);
    }
    return s;
  }, [lines, customerWholesalePct]);

  const wholesaleSavingsNetCents = useMemo(() => {
    if (customerWholesalePct <= 0) return 0;
    let s = 0;
    for (const line of lines) {
      s += lineBaseCents(line, 0) - lineBaseCents(line, customerWholesalePct);
    }
    return s;
  }, [lines, customerWholesalePct]);

  const catalogNetSubtotalCents = useMemo(() => {
    let s = 0;
    for (const line of lines) {
      s += lineBaseCents(line, 0);
    }
    return s;
  }, [lines]);

  const vatCents = useMemo(() => {
    let s = 0;
    for (const line of lines) s += lineVatCents(line, customerWholesalePct);
    return s;
  }, [lines, customerWholesalePct]);

  const totalCents = subtotalCents + vatCents;

  const cartStockExceeded = useMemo(() => {
    const byId = new Map<string, number>();
    const stockById = new Map<string, number>();
    for (const l of lines) {
      const pid = l.product.id;
      byId.set(pid, (byId.get(pid) ?? 0) + l.quantity);
      if (!stockById.has(pid)) {
        stockById.set(
          pid,
          Number(l.product.stock_local ?? l.product.stock_quantity ?? 0),
        );
      }
    }
    for (const [pid, sum] of byId) {
      if (sum > (stockById.get(pid) ?? 0)) return true;
    }
    return false;
  }, [lines]);

  const selectedShipOption = useMemo(
    () => shipOptions.find((o) => o.id === shipChoice) ?? null,
    [shipOptions, shipChoice],
  );

  const savedAddressOptions = useMemo(
    () => shipOptions.filter((o): o is Extract<ShipOption, { kind: "address" }> => o.kind === "address"),
    [shipOptions],
  );

  const cashGivenCents = parseCopInputDigitsToInt(cashGivenRaw);
  const mixedCashCents = parseCopInputDigitsToInt(mixedCashRaw);
  const mixedTransferCents = parseCopInputDigitsToInt(mixedTransferRaw);

  const changeCents =
    payment === "cash" && cashGivenCents >= totalCents
      ? cashGivenCents - totalCents
      : null;

  const mixedOk =
    mixedCashCents + mixedTransferCents === totalCents && totalCents > 0;

  /** Efectivo y transferencia no exigen campos extra; el monto en efectivo es solo ayuda para el vuelto. */
  const paymentOk = payment !== "mixed" || mixedOk;

  const canSubmit =
    customer !== null &&
    lines.length > 0 &&
    totalCents > 0 &&
    shipChoice !== null &&
    shipChoice !== "" &&
    !shipLoading &&
    !cartStockExceeded &&
    paymentOk;

  function addProduct(p: ProductHit) {
    setLines((prev) => {
      const stock = Number(p.stock_local ?? p.stock_quantity ?? 0);
      if (stock < 1) return prev;
      let sum = 0;
      for (const l of prev) {
        if (l.product.id === p.id) sum += l.quantity;
      }
      if (sum + 1 > stock) return prev;
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          product: p,
          quantity: 1,
          discountMode: "none",
          discountPercent: 0,
          discountAmountRaw: "",
        },
      ];
    });
    setProductQuery("");
    setProductHits([]);
  }

  function setQty(key: string, q: number) {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line) return prev;
      const stock = Number(line.product.stock_local ?? line.product.stock_quantity ?? 0);
      let usedElsewhere = 0;
      for (const l of prev) {
        if (l.product.id === line.product.id && l.key !== key) usedElsewhere += l.quantity;
      }
      const maxQty = Math.max(1, stock - usedElsewhere);
      const next = Math.max(1, Math.min(maxQty, Math.floor(q)));
      return prev.map((l) => (l.key === key ? { ...l, quantity: next } : l));
    });
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function setLineDiscountMode(key: string, mode: LineDiscountMode) {
    setLines((prev) =>
      prev.map((line) =>
        line.key !== key
          ? line
          : {
              ...line,
              discountMode: mode,
              ...(mode === "none"
                ? { discountPercent: 0, discountAmountRaw: "" }
                : mode === "percent"
                  ? { discountAmountRaw: "" }
                  : { discountPercent: 0 }),
            },
      ),
    );
  }

  function setLineDiscountPercent(key: string, v: number) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, discountPercent: v } : line)),
    );
  }

  function setLineDiscountAmountRaw(key: string, raw: string) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, discountAmountRaw: raw } : line)),
    );
  }

  const payloadJson = useMemo(() => {
    if (!customer) return "";
    let address: string | null = null;
    if (!shipChoice || shipChoice === "pickup") {
      address = "Retiro en tienda";
    } else {
      const opt = shipOptions.find((o) => o.id === shipChoice);
      if (!opt || opt.kind === "pickup") {
        address = "Retiro en tienda";
      } else {
        address = [opt.label, opt.detail].filter(Boolean).join(" — ");
      }
    }
    const phone = customer.phone?.trim() || null;
    return JSON.stringify({
      customerId: customer.id,
      lines: lines.map((l) => {
        const pct = effectiveLineDiscountPercent(l);
        const amt =
          pct != null ? 0 : effectiveLineDiscountAmountCents(l, customerWholesalePct);
        return {
          productId: l.product.id,
          quantity: l.quantity,
          discountPercent: pct,
          discountAmountCents: amt,
        };
      }),
      paymentMethod: payment,
      shippingAddress: address,
      shippingPhone: phone,
    });
  }, [customer, lines, payment, shipChoice, shipOptions, customerWholesalePct]);

  const banner = errorMessage(initialError);

  return (
    <div className="space-y-6">
      {banner ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {banner}
        </p>
      ) : null}

      <form action={createPosInvoiceAction} className="space-y-6">
        <input type="hidden" name="payload" value={payloadJson} readOnly />

        <div className="flex min-w-0 flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start xl:gap-8">
          <section
            className={`${cardSectionClass} order-2 xl:order-none xl:col-start-1 xl:row-start-1`}
          >
            <h2 className={sectionTitle}>Productos</h2>
            <div className="relative mt-5">
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Buscar por nombre o código"
                className={inputClass}
                autoComplete="off"
              />
              {productQuery.trim().length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-md shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-lg dark:shadow-black/30">
                  {productLoading ? (
                    <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      Buscando…
                    </p>
                  ) : productHits.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      Sin resultados.
                    </p>
                  ) : (
                    productHits.map((p) => {
                      const stock = Number(p.stock_local ?? p.stock_quantity ?? 0);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          disabled={stock < 1}
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-zinc-50/80 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800/90"
                        >
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {p.name}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {p.reference ? `${p.reference} · ` : null}
                            {formatCop(unitFinalCents(p, customerWholesalePct))}
                            {stock < 6 ? ` · Stock tienda: ${stock}` : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section
            className={`${cardSectionClass} order-3 xl:order-none xl:col-start-1 xl:row-start-2`}
          >
            <h2 className={sectionTitle}>Productos seleccionados</h2>
            {lines.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
                Agrega productos desde la búsqueda.
              </p>
            ) : (
              <>
                <ul className="mt-5 divide-y divide-zinc-200/80 dark:divide-zinc-700/90">
                {lines.map((line) => {
                  const stock = Number(
                    line.product.stock_local ?? line.product.stock_quantity ?? 0,
                  );
                  const w = customerWholesalePct;
                  let usedElsewhere = 0;
                  for (const l of lines) {
                    if (l.product.id === line.product.id && l.key !== line.key) {
                      usedElsewhere += l.quantity;
                    }
                  }
                  const maxQtyThisLine = Math.max(1, stock - usedElsewhere);
                  const lineSubtotal = lineNetAfterDiscount(line, w);
                  const lineVat = lineVatCents(line, w);
                  const lineTotal = lineSubtotal + lineVat;
                  const unitCatalogGross = unitFinalCents(line.product, w);
                  const unitLineGross = lineUnitGrossAfterDiscount(line, w);
                  const hasLineDiscount =
                    lineNetAfterDiscount(line, w) < lineNetBeforeDiscount(line, w);
                  const maxDiscNet = lineNetBeforeDiscount(line, w);
                  const discBtn =
                    "rounded-md px-2 py-1 text-[11px] font-medium transition";
                  return (
                    <li key={line.key} className="space-y-2 py-4 first:pt-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {line.product.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {hasLineDiscount ? (
                              <>
                                <span className="mr-1 line-through opacity-60">
                                  {formatCop(unitCatalogGross)}
                                </span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                  {formatCop(unitLineGross)} c/u
                                </span>
                              </>
                            ) : (
                              <span>{formatCop(unitCatalogGross)} c/u</span>
                            )}
                            {line.product.has_vat
                              ? ` · IVA ${String(saleVatPercentLabel(line.product.has_vat) ?? 0).replace(/\.0+$/, "")}%`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            onClick={() => setQty(line.key, line.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            onClick={() => setQty(line.key, line.quantity + 1)}
                            disabled={line.quantity >= maxQtyThisLine}
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatCop(lineTotal)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">
                          Descuento (neto línea)
                        </span>
                        <span className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                          {(["none", "percent", "amount"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setLineDiscountMode(line.key, mode)}
                              className={`${discBtn} ${
                                line.discountMode === mode
                                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {mode === "none" ? "Ninguno" : mode === "percent" ? "%" : "$ COP"}
                            </button>
                          ))}
                        </span>
                        {line.discountMode === "percent" ? (
                          <label className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                            <span>%</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              inputMode="numeric"
                              value={line.discountPercent > 0 ? line.discountPercent : ""}
                              onChange={(e) =>
                                setLineDiscountPercent(
                                  line.key,
                                  Math.min(100, Math.max(0, Math.floor(Number(e.target.value) || 0))),
                                )
                              }
                              className="w-14 rounded-md border border-zinc-200/90 bg-white px-2 py-1 tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                        ) : null}
                        {line.discountMode === "amount" ? (
                          <label className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:max-w-xs">
                            <span className="shrink-0 text-zinc-600 dark:text-zinc-300">Monto</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={line.discountAmountRaw}
                              onChange={(e) =>
                                setLineDiscountAmountRaw(line.key, e.target.value.replace(/\D/g, ""))
                              }
                              className="min-w-0 flex-1 rounded-md border border-zinc-200/90 bg-white px-2 py-1 tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                            <span className="shrink-0 text-[10px] text-zinc-400">
                              máx. {formatCop(maxDiscNet)}
                            </span>
                          </label>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {cartStockExceeded ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  La cantidad total por producto supera el stock en tienda. Ajustá cantidades o
                  quitá líneas.
                </p>
              ) : null}
              </>
            )}
          </section>

          <div
            className="
              contents
              xl:col-start-2 xl:row-start-1 xl:row-span-4
              xl:flex xl:flex-col xl:gap-6
              xl:sticky xl:top-24 xl:z-10 xl:self-start
            "
          >
            <section className={`${cardSectionClass} order-1 xl:order-none`}>
              <h2 className={sectionTitle}>
                Cliente <span className="text-red-600 dark:text-red-400">*</span>
              </h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="relative min-w-0 flex-1">
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Buscar por nombre, cédula, email o teléfono"
                    className={inputClass}
                    disabled={!!customer}
                    autoComplete="off"
                  />
                  {!customer && customerQuery.trim().length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-md shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-lg dark:shadow-black/30">
                      {customerLoading ? (
                        <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                          Buscando…
                        </p>
                      ) : customerHits.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                          Sin resultados.
                        </p>
                      ) : (
                        customerHits.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCustomer(c);
                              setCustomerQuery("");
                              setCustomerHits([]);
                            }}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/90"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {c.name}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {[c.document_id, c.email, c.phone].filter(Boolean).join(" · ")}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickError(null);
                    setQuickModalOpen(true);
                  }}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  + Nuevo cliente
                </button>
              </div>
              {customer ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/90 bg-white/60 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/80">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {customer.name}
                  </span>
                  {posCustomerKind === "wholesale" ? (
                    <span className="rounded-full border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100">
                      Mayorista
                      {customerWholesalePct > 0 ? ` · ${customerWholesalePct}%` : null}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                    onClick={() => {
                      setCustomer(null);
                      setCustomerWholesalePct(0);
                      setPosCustomerKind("retail");
                      setShipChoice(null);
                      setShipOptions([]);
                    }}
                  >
                    Cambiar
                  </button>
                </div>
              ) : null}
            </section>

            <section className={`${cardSectionClass} order-4 xl:order-none`}>
              <h2 className={`${sectionTitle} flex items-center gap-2`}>
                <IconHome />
                Envío
              </h2>
              {!customer ? (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Selecciona un cliente para habilitar el envío
                </p>
              ) : shipLoading ? (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Cargando direcciones…
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={labelClass}>Entrega</label>
                    <select
                      value={shipChoice ?? shipOptions[0]?.id ?? ""}
                      onChange={(e) => setShipChoice(e.target.value || null)}
                      className={inputClass}
                    >
                      {shipOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                          {o.kind === "address" ? ` — ${o.detail}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedShipOption ? (
                    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {selectedShipOption.kind === "address" ? "Dirección elegida" : "Detalle"}
                      </p>
                      <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                        {selectedShipOption.label}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {selectedShipOption.detail}
                      </p>
                    </div>
                  ) : null}
                  {shipChoice === "pickup" && savedAddressOptions.length > 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200/90 bg-white/50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-950/30">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Otras direcciones guardadas
                      </p>
                      <ul className="mt-2 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {savedAddressOptions.map((o) => (
                          <li key={o.id}>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {o.label}
                            </span>
                            <span className="text-zinc-500 dark:text-zinc-400"> — </span>
                            <span className="whitespace-pre-line">{o.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className={`${cardSectionClass} order-5 xl:order-none`}>
              <h2 className={sectionTitle}>Método de pago</h2>
              <div className="mt-4 flex rounded-xl border border-zinc-200/90 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800/80">
                {(
                  [
                    { id: "cash" as const, label: "Efectivo", icon: <IconCoin /> },
                    { id: "transfer" as const, label: "Transferencia", icon: <IconCard /> },
                    { id: "mixed" as const, label: "Mixto", icon: <IconGrid /> },
                  ] as const
                ).map((tab) => {
                  const active = payment === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPayment(tab.id)}
                      className={[
                        "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition sm:flex-row sm:text-sm",
                        active
                          ? "border border-zinc-300 bg-white text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none"
                          : "text-zinc-600 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/70 dark:hover:text-zinc-100",
                      ].join(" ")}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {payment === "cash" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Cuánto me dieron</label>
                    <input
                      value={cashGivenRaw}
                      onChange={(e) => setCashGivenRaw(e.target.value)}
                      inputMode="numeric"
                      placeholder="Opcional"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cuánto regreso</label>
                    <p className="mt-2 rounded-lg border border-zinc-200/90 bg-white/60 px-3 py-2.5 text-sm font-medium tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100">
                      {changeCents !== null ? formatCop(changeCents) : "—"}
                    </p>
                  </div>
                </div>
              ) : null}

              {payment === "transfer" ? (
                <div className="mt-5">
                  <label className={labelClass}>Referencia (opcional)</label>
                  <input
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. comprobante #12345"
                  />
                </div>
              ) : null}

              {payment === "mixed" ? (
                <div className="mt-5 space-y-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Los importes en efectivo y transferencia deben sumar el total exacto.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Efectivo</label>
                      <input
                        value={mixedCashRaw}
                        onChange={(e) => setMixedCashRaw(e.target.value)}
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Transferencia</label>
                      <input
                        value={mixedTransferRaw}
                        onChange={(e) => setMixedTransferRaw(e.target.value)}
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {!mixedOk && totalCents > 0 ? (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      La suma debe ser {formatCop(totalCents)}.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className={`${cardSectionClass} order-6 xl:order-none`}>
              <h2 className={sectionTitle}>Resumen</h2>
              <div className="mt-4 rounded-lg border border-zinc-200/90 bg-white/60 p-3 text-sm sm:p-4 dark:border-zinc-700 dark:bg-zinc-950/70">
                <dl className="space-y-2 text-zinc-700 dark:text-zinc-300">
                  {wholesaleSavingsNetCents > 0 ? (
                    <>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500 dark:text-zinc-400">
                          Subtotal (precio de lista)
                        </dt>
                        <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                          {formatCop(catalogNetSubtotalCents)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-emerald-700 dark:text-emerald-400">
                          Descuento mayorista ({customerWholesalePct}%)
                        </dt>
                        <dd className="tabular-nums font-medium text-emerald-800 dark:text-emerald-300">
                          −{formatCop(wholesaleSavingsNetCents)}
                        </dd>
                      </div>
                    </>
                  ) : posCustomerKind === "wholesale" &&
                    customerWholesalePct <= 0 &&
                    lines.length > 0 ? (
                    <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100">
                      Cliente mayorista sin porcentaje de descuento configurado en su ficha.
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      Subtotal
                      {customerWholesalePct > 0 ? (
                        <span className="mt-0.5 block text-[10px] font-normal normal-case text-zinc-400 dark:text-zinc-500">
                          (neto mercancía)
                        </span>
                      ) : null}
                    </dt>
                    <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCop(subtotalCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/90">
                    <dt className="text-zinc-500 dark:text-zinc-400">IVA</dt>
                    <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCop(vatCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/90">
                    <dt className="text-zinc-600 dark:text-zinc-400">Total</dt>
                    <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCop(totalCents)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="mt-5 border-t border-zinc-200/70 pt-5 dark:border-zinc-700/90">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Total a cobrar
                </p>
                <p className="mt-1 text-xl font-medium tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                  {formatCop(totalCents)}
                </p>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Verifica cliente, productos y pago antes de confirmar. La factura quedará
                registrada como venta en mostrador.
              </p>
              <ConfirmInvoiceButton disabled={!canSubmit} />
            </section>
          </div>
        </div>
      </form>

      {quickModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-4 py-10 backdrop-blur-[1px] dark:bg-black/55 sm:py-16">
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-default"
            aria-label="Cerrar"
            onClick={closeQuickCustomerModal}
          />
          <div
            className="relative z-10 mt-4 w-full max-w-md rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)] sm:mt-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-customer-title"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="quick-customer-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Nuevo cliente rápido
              </h2>
              <button
                type="button"
                onClick={closeQuickCustomerModal}
                className="rounded-lg p-1.5 text-lg leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Nombre y cédula para facturar ya. La factura en curso no se pierde.
            </p>
            <form onSubmit={submitQuickCustomer} className="mt-5 space-y-4">
              {quickError ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
                  {quickError}
                </p>
              ) : null}
              <div>
                <label htmlFor="quick-customer-name" className={labelClass}>
                  Nombre <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  ref={quickNameInputRef}
                  id="quick-customer-name"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre del cliente"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="quick-customer-doc" className={labelClass}>
                  Cédula / documento
                </label>
                <input
                  id="quick-customer-doc"
                  value={quickDocument}
                  onChange={(e) => setQuickDocument(e.target.value)}
                  className={inputClass}
                  placeholder="Ej. 12.345.678"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeQuickCustomerModal}
                  className="rounded-lg border border-zinc-200/90 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickPending}
                  className="rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                >
                  {quickPending ? "Guardando…" : "Crear y usar"}
                </button>
              </div>
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                <Link
                  href="/admin/customers/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100"
                  onClick={closeQuickCustomerModal}
                >
                  Ficha completa con direcciones y más datos
                </Link>
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
