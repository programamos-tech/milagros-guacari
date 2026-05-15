import { formatStoreVentaFecha } from "@/lib/store-datetime-format";

/** Ventas POS marcan método en `wompi_reference` con prefijo `POS:`. */
export function isVentaFisica(wompiReference: string | null | undefined): boolean {
  const r = wompiReference?.trim() ?? "";
  return r.startsWith("POS:");
}

export type VentaFormaPagoOpts = {
  checkoutPaymentMethod?: string | null;
};

export function ventaFormaPagoLabel(
  wompiReference: string | null | undefined,
  opts?: VentaFormaPagoOpts,
): string {
  const r = wompiReference?.trim() ?? "";
  if (r === "POS:cash") return "Efectivo";
  if (r === "POS:transfer") return "Transferencia";
  if (r === "POS:mixed") return "Mixto";
  if (r.startsWith("POS:")) return "Mostrador";
  if (opts?.checkoutPaymentMethod === "transfer") return "Transferencia (web)";
  return "En línea";
}

/** Pill de forma de pago (colores para escanear la tabla). */
export function ventaFormaPagoBadge(
  wompiReference: string | null | undefined,
  opts?: VentaFormaPagoOpts,
): { label: string; className: string } {
  const r = wompiReference?.trim() ?? "";
  if (r === "POS:cash") {
    return {
      label: "Efectivo",
      className:
        "bg-amber-50 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-700/50",
    };
  }
  if (r === "POS:transfer") {
    return {
      label: "Transferencia",
      className:
        "bg-sky-50 text-sky-900 ring-1 ring-sky-200/90 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-700/50",
    };
  }
  if (r === "POS:mixed") {
    return {
      label: "Mixto",
      className:
        "bg-violet-50 text-violet-900 ring-1 ring-violet-200/90 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-700/50",
    };
  }
  if (r.startsWith("POS:")) {
    return {
      label: "Mostrador",
      className:
        "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-100 dark:ring-zinc-600/70",
    };
  }
  if (opts?.checkoutPaymentMethod === "transfer") {
    return {
      label: "Transferencia (web)",
      className:
        "bg-sky-50 text-sky-900 ring-1 ring-sky-200/90 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-700/50",
    };
  }
  return {
    label: "En línea",
    className:
      "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/90 dark:bg-indigo-950/45 dark:text-indigo-100 dark:ring-indigo-700/50",
  };
}

export type VentaPagoFilter = "all" | "cash" | "transfer" | "mixed" | "online";

export function matchesVentaPagoFilter(
  wompiReference: string | null | undefined,
  filter: VentaPagoFilter,
  opts?: VentaFormaPagoOpts,
): boolean {
  if (filter === "all") return true;
  const r = wompiReference?.trim() ?? "";
  const fisica = r.startsWith("POS:");
  if (filter === "online") {
    if (fisica) return false;
    if (opts?.checkoutPaymentMethod === "transfer") return false;
    return true;
  }
  if (filter === "cash") return r === "POS:cash";
  if (filter === "transfer") {
    if (r === "POS:transfer") return true;
    if (opts?.checkoutPaymentMethod === "transfer") return true;
    return false;
  }
  if (filter === "mixed") return r === "POS:mixed";
  return true;
}

export type VentaEstadoFilter = "all" | "paid" | "cancelled" | "pending" | "failed";

/** Estado del cobro (columna distinta al ciclo de factura en el detalle). */
export function ventaPagoRecibidoBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "paid":
      return {
        label: "Pagado",
        className:
          "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-700/50",
      };
    case "pending":
      return {
        label: "Pendiente",
        className:
          "bg-amber-50 text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-800/50",
      };
    case "failed":
      return {
        label: "Fallido",
        className:
          "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-600/70",
      };
    case "cancelled":
      return {
        label: "Cancelado",
        className:
          "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800/50",
      };
    default:
      return {
        label: status,
        className:
          "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-200 dark:ring-zinc-600/70",
      };
  }
}

export function ventaEstadoBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "paid":
      return {
        label: "Finalizada",
        className:
          "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-700/50",
      };
    case "cancelled":
      return {
        label: "Anulada",
        className:
          "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800/50",
      };
    case "pending":
      return {
        label: "Pendiente",
        className:
          "bg-amber-50 text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-800/50",
      };
    case "failed":
      return {
        label: "Fallida",
        className:
          "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-600/70",
      };
    default:
      return {
        label: status,
        className:
          "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-200 dark:ring-zinc-600/70",
      };
  }
}

/** Número corto legible para la columna factura/pedido (no correlativo real). */
export function ventaNumeroReferencia(id: string): string {
  const hex = id.replace(/-/g, "").slice(-10);
  const n = parseInt(hex.slice(0, 8), 16);
  if (!Number.isFinite(n)) return id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return String(n % 100000).padStart(5, "0");
}

export function formatVentaFecha(iso: string | null | undefined): string {
  return formatStoreVentaFecha(iso);
}
