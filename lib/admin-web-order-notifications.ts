export type AdminWebOrderNotification = {
  id: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  createdAt: string;
  checkoutPaymentMethod: string;
  read: boolean;
};

const STORAGE_KEY = "admin_web_order_notification_ids_v1";
const MAX_ITEMS = 30;

export function isWebStorefrontOrder(row: Record<string, unknown>): boolean {
  const ref = String(row.wompi_reference ?? "").trim();
  if (ref.startsWith("POS:")) return false;
  return String(row.status) === "pending";
}

export function rowToWebOrderNotification(
  row: Record<string, unknown>,
): AdminWebOrderNotification | null {
  if (!isWebStorefrontOrder(row)) return null;
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    customerName: String(row.customer_name ?? "Cliente"),
    customerEmail: String(row.customer_email ?? ""),
    totalCents: Math.max(0, Number(row.total_cents ?? 0)),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    checkoutPaymentMethod: String(row.checkout_payment_method ?? "wompi"),
    read: false,
  };
}

export function loadPersistedNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function persistNotificationIds(ids: Iterable<string>) {
  if (typeof window === "undefined") return;
  try {
    const list = [...ids].slice(-MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function webOrderPaymentLabel(method: string): string {
  return method === "transfer" ? "Transferencia (web)" : "Pago en línea";
}
