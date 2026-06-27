import type { SupabaseClient } from "@supabase/supabase-js";

/** Solo en dev: en prod el `.select()` del insert ya confirma la fila. */
export function shouldVerifyAdminInsert(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Confirma que la fila quedó persistida (lectura posterior al insert). */
export async function verifyInsertedRow(
  supabase: SupabaseClient,
  table: string,
  id: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .maybeSingle();
  return !error && Boolean(data?.id);
}

/** Confirma un mínimo de filas hijas (p. ej. líneas de pedido). */
export async function verifyRowCountAtLeast(
  supabase: SupabaseClient,
  table: string,
  filter: { column: string; value: string },
  expectedMin: number,
): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(filter.column, filter.value);
  return !error && (count ?? 0) >= expectedMin;
}

/** En prod omite la query extra; en dev valida persistencia. */
export async function verifyInsertedRowInDev(
  supabase: SupabaseClient,
  table: string,
  id: string,
): Promise<boolean> {
  if (!shouldVerifyAdminInsert()) return true;
  return verifyInsertedRow(supabase, table, id);
}

/** En prod omite el conteo extra; en dev valida filas hijas. */
export async function verifyRowCountAtLeastInDev(
  supabase: SupabaseClient,
  table: string,
  filter: { column: string; value: string },
  expectedMin: number,
): Promise<boolean> {
  if (!shouldVerifyAdminInsert()) return true;
  return verifyRowCountAtLeast(supabase, table, filter, expectedMin);
}
