import type { SupabaseClient } from "@supabase/supabase-js";
import { createdAtBoundsForReportYmdRange } from "@/lib/admin-report-range";

const ORDERS_PAGE_SIZE = 1000;
const ORDER_ITEMS_IN_CHUNK = 120;

/**
 * Todos los pedidos con `created_at` en el rango de días calendario tienda `[fromYmd, toYmd]`
 * (vía {@link createdAtBoundsForReportYmdRange}), paginando para superar el límite de PostgREST.
 */
export async function fetchOrdersCreatedInReportYmdWindow(
  supabase: SupabaseClient,
  fromYmd: string,
  toYmd: string,
  select: string,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  const bounds = createdAtBoundsForReportYmdRange(fromYmd, toYmd);
  if (!bounds) return { rows: [], error: null };
  const out: Record<string, unknown>[] = [];
  let start = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select(select)
      .gte("created_at", bounds.gte)
      .lt("created_at", bounds.lt)
      .order("created_at", { ascending: true })
      .range(start, start + ORDERS_PAGE_SIZE - 1);
    if (error) return { rows: out, error: error.message };
    const chunk = (data ?? []) as unknown as Record<string, unknown>[];
    out.push(...chunk);
    if (chunk.length < ORDERS_PAGE_SIZE) break;
    start += ORDERS_PAGE_SIZE;
    if (out.length > 100_000) {
      return {
        rows: out,
        error: "Demasiados pedidos en el rango (>100k); acotá las fechas.",
      };
    }
  }
  return { rows: out, error: null };
}

export async function fetchOrderItemsInChunks(
  supabase: SupabaseClient,
  orderIds: string[],
  select: string,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  if (orderIds.length === 0) return { rows: [], error: null };
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < orderIds.length; i += ORDER_ITEMS_IN_CHUNK) {
    const part = orderIds.slice(i, i + ORDER_ITEMS_IN_CHUNK);
    const { data, error } = await supabase
      .from("order_items")
      .select(select)
      .in("order_id", part);
    if (error) return { rows: out, error: error.message };
    out.push(...((data ?? []) as unknown as Record<string, unknown>[]));
  }
  return { rows: out, error: null };
}
