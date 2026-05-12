import type { AdminCustomerOrderRow } from "@/lib/supabase/admin-customer-detail";

/**
 * Pedido con envío a domicilio (dirección distinta de retiro en tienda / mostrador).
 * Sin dirección no se cuenta como domicilio (p. ej. venta POS o checkout sin envío).
 */
export function isDomicilioOrder(
  o: Pick<AdminCustomerOrderRow, "shipping_address">,
): boolean {
  const a = (o.shipping_address ?? "").trim();
  if (!a) return false;
  const low = a.toLowerCase();
  if (
    /retiro|recoge|en\s+tienda|mostrador|local|pasar\s+por|pick\s*up|pickup/i.test(
      low,
    )
  ) {
    return false;
  }
  return true;
}
