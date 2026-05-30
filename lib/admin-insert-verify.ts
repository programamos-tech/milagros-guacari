import type { SupabaseClient } from "@supabase/supabase-js";

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
