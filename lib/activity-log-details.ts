import type { AdminActivityAction } from "@/lib/admin-activity-log";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export function formatMoneyCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function paymentMethodLabel(raw: string): string {
  switch (raw) {
    case "cash":
      return "Efectivo";
    case "transfer":
      return "Transferencia";
    case "mixed":
      return "Mixto (efectivo + transferencia)";
    default:
      return raw;
  }
}

function stockLocationLabel(loc: string): string {
  return loc === "warehouse" ? "Depósito" : "Tienda (local)";
}

function movementModeLabel(mode: string): string {
  return mode === "add" ? "Suma al existente" : "Reemplazar valor";
}

export type ActivityDetailRow = { label: string; value: string };

/**
 * Filas de detalle derivadas del `metadata` guardado al registrar la actividad.
 */
export function getActivityDetailRows(
  action: AdminActivityAction,
  metadata: Record<string, unknown> | null | undefined,
): ActivityDetailRow[] {
  const m = metadata ?? {};
  const rows: ActivityDetailRow[] = [];

  const source = str(m.source);
  if (source === "pos_quick") {
    rows.push({ label: "Origen", value: "Alta rápida desde facturación" });
  } else if (source === "form") {
    rows.push({ label: "Origen", value: "Formulario de clientes" });
  }

  if (action === "customer_created" || action === "customer_updated") {
    const doc = str(m.document_id);
    if (doc) rows.push({ label: "Documento", value: doc });
    const em = str(m.email);
    if (em) rows.push({ label: "Correo", value: em });
    const ph = str(m.phone);
    if (ph) rows.push({ label: "Teléfono", value: ph });
  }

  const price = num(m.price_cents);
  if (price != null && price >= 0) {
    rows.push({ label: "Precio venta", value: formatMoneyCOP(price) });
  }

  const wh = num(m.stock_warehouse);
  const loc = num(m.stock_local);
  if (wh != null || loc != null) {
    if (wh != null) rows.push({ label: "Stock depósito", value: String(wh) });
    if (loc != null) rows.push({ label: "Stock tienda", value: String(loc) });
  }

  if (action === "stock_adjusted") {
    const location = str(m.location);
    if (location) {
      rows.push({ label: "Ubicación", value: stockLocationLabel(location) });
    }
    const mode = str(m.movement_mode);
    if (mode) {
      rows.push({ label: "Modo", value: movementModeLabel(mode) });
    }
    const qty = num(m.quantity);
    if (qty != null) rows.push({ label: "Cantidad (operación)", value: String(qty) });
    const pl = num(m.previous_local);
    const pw = num(m.previous_warehouse);
    const nl = num(m.next_local);
    const nw = num(m.next_warehouse);
    if (pl != null && nl != null) {
      rows.push({ label: "Stock tienda", value: `${pl} → ${nl}` });
    }
    if (pw != null && nw != null) {
      rows.push({ label: "Stock depósito", value: `${pw} → ${nw}` });
    }
  }

  if (action === "stock_transferred") {
    const dir = str(m.direction);
    if (dir === "local_to_warehouse") {
      rows.push({ label: "Sentido", value: "Tienda → depósito" });
    } else if (dir === "warehouse_to_local") {
      rows.push({ label: "Sentido", value: "Depósito → tienda" });
    }
    const qty = num(m.quantity);
    if (qty != null) rows.push({ label: "Unidades", value: String(qty) });
    const pl = num(m.previous_local);
    const pw = num(m.previous_warehouse);
    const nl = num(m.next_local);
    const nw = num(m.next_warehouse);
    if (pl != null && nl != null) {
      rows.push({ label: "Stock tienda", value: `${pl} → ${nl}` });
    }
    if (pw != null && nw != null) {
      rows.push({ label: "Stock depósito", value: `${pw} → ${nw}` });
    }
  }

  if (action === "sale_created") {
    const total = num(m.total_cents);
    if (total != null) {
      rows.push({ label: "Total", value: formatMoneyCOP(total) });
    }
    const pm = str(m.payment_method);
    if (pm) rows.push({ label: "Pago", value: paymentMethodLabel(pm) });
    const lines = num(m.line_items);
    if (lines != null) rows.push({ label: "Líneas en factura", value: String(lines) });
    const cid = str(m.customer_id);
    if (cid) {
      rows.push({
        label: "ID cliente",
        value: cid.slice(0, 8) + "…",
      });
    }
  }

  if (action === "sale_cancelled") {
    const reason = str(m.cancellation_reason);
    if (reason) {
      rows.push({ label: "Motivo", value: reason });
    }
  }

  return rows;
}
