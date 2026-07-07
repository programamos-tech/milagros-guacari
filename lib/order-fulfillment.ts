export type OrderFulfillmentStatus =
  | "awaiting_payment"
  | "preparing"
  | "shipped"
  | "completed";

export const ORDER_FULFILLMENT_STATUSES: OrderFulfillmentStatus[] = [
  "awaiting_payment",
  "preparing",
  "shipped",
  "completed",
];

export function isOrderFulfillmentStatus(v: string): v is OrderFulfillmentStatus {
  return (ORDER_FULFILLMENT_STATUSES as string[]).includes(v);
}

export function orderFulfillmentLabel(status: OrderFulfillmentStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "Pendiente de pago";
    case "preparing":
      return "En alistamiento";
    case "shipped":
      return "Despachado";
    case "completed":
      return "Finalizado";
    default:
      return status;
  }
}

export function orderFulfillmentHint(status: OrderFulfillmentStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "Estamos esperando tu transferencia y el comprobante de pago.";
    case "preparing":
      return "Recibimos tu pago y estamos preparando tu pedido.";
    case "shipped":
      return "Tu pedido ya fue despachado. Pronto deberías recibirlo.";
    case "completed":
      return "Tu pedido fue entregado. ¡Gracias por tu compra!";
    default:
      return "Consulta este enlace para ver actualizaciones.";
  }
}

export function isTransferWebOrder(checkoutPaymentMethod: string | null | undefined): boolean {
  return checkoutPaymentMethod === "transfer";
}

export function storeOrderTrackingLabel(opts: {
  paymentStatus: string;
  fulfillmentStatus: string | null;
  checkoutPaymentMethod: string | null;
  proofCount?: number;
}): string {
  const { paymentStatus, fulfillmentStatus, checkoutPaymentMethod, proofCount = 0 } = opts;

  if (isTransferWebOrder(checkoutPaymentMethod)) {
    if (fulfillmentStatus && isOrderFulfillmentStatus(fulfillmentStatus)) {
      return orderFulfillmentLabel(fulfillmentStatus);
    }
    if (proofCount > 0 || paymentStatus === "paid") {
      return orderFulfillmentLabel("preparing");
    }
    return orderFulfillmentLabel("awaiting_payment");
  }

  switch (paymentStatus) {
    case "pending":
      return "Pendiente de pago";
    case "paid":
      return "Pagado";
    case "failed":
      return "Pago fallido";
    case "cancelled":
      return "Cancelado";
    default:
      return paymentStatus;
  }
}

export function storeOrderTrackingHint(opts: {
  paymentStatus: string;
  fulfillmentStatus: string | null;
  checkoutPaymentMethod: string | null;
  proofCount?: number;
}): string {
  const { paymentStatus, fulfillmentStatus, checkoutPaymentMethod, proofCount = 0 } = opts;

  if (isTransferWebOrder(checkoutPaymentMethod)) {
    if (fulfillmentStatus && isOrderFulfillmentStatus(fulfillmentStatus)) {
      return orderFulfillmentHint(fulfillmentStatus);
    }
    if (proofCount > 0 || paymentStatus === "paid") {
      return orderFulfillmentHint("preparing");
    }
    return orderFulfillmentHint("awaiting_payment");
  }

  switch (paymentStatus) {
    case "pending":
      return "Estamos esperando tu transferencia. Cuando la confirmemos, actualizaremos el estado aquí.";
    case "paid":
      return "Tu pago fue confirmado. Te contactaremos si hace falta algo para el envío.";
    case "failed":
      return "El pago no se completó. Escríbenos si necesitas ayuda.";
    case "cancelled":
      return "Este pedido fue cancelado.";
    default:
      return "Consulta este enlace para ver actualizaciones.";
  }
}

export function orderFulfillmentBadgeClass(status: OrderFulfillmentStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "bg-amber-50 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-800/50";
    case "preparing":
      return "bg-sky-50 text-sky-900 ring-1 ring-sky-200/90 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-700/50";
    case "shipped":
      return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/90 dark:bg-violet-950/45 dark:text-violet-100 dark:ring-violet-700/50";
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-700/50";
    default:
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-200 dark:ring-zinc-600/70";
  }
}

/** Opciones editables en admin (sin «pendiente de pago» una vez hay comprobante). */
export const ADMIN_FULFILLMENT_OPTIONS: { value: OrderFulfillmentStatus; label: string }[] = [
  { value: "preparing", label: "En alistamiento" },
  { value: "shipped", label: "Despachado" },
  { value: "completed", label: "Finalizado" },
];
