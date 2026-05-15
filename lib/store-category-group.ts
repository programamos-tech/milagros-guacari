import type { SupabaseClient } from "@supabase/supabase-js";

const CATEGORY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Varias categorías del filtro → todos los `category_id` equivalentes (sinónimos). */
export function expandManyCategoryIdsFromRows(
  rows: { id: string; name: string }[],
  categoryIds: string[],
): string[] {
  const set = new Set<string>();
  for (const id of categoryIds) {
    const t = id.trim().toLowerCase();
    if (!CATEGORY_UUID_RE.test(t)) continue;
    for (const e of expandCategoryIdsFromRows(rows, t)) set.add(e);
  }
  return [...set];
}

/** Comparación estable para fusionar filas duplicadas en BD / Excel. */
export function normalizeCategoryLabel(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Variantes de nombre que deben compartir listado y menú.
 * Claves en forma ya normalizada (`normalizeCategoryLabel`).
 */
const CATEGORY_SYNONYM_CANONICAL: Record<string, string> = {
  "skin care": "cuidado de la piel",
  "make up": "maquillaje",
};

/**
 * Normaliza solo para agrupar: quita artículos sueltos (el/la/los/las) para unir
 * p. ej. "Cuidado de la piel" y "Cuidado de piel" en una sola entrada del menú.
 */
function categoryNameForGroupingKey(name: string): string {
  const n = normalizeCategoryLabel(name);
  return n
    .replace(/\b(el|la|los|las)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clave de agrupación para menú, filtros y seed. */
export function categoryGroupKey(name: string): string {
  const n = normalizeCategoryLabel(name);
  const stripped = categoryNameForGroupingKey(name);
  return (
    CATEGORY_SYNONYM_CANONICAL[n] ??
    CATEGORY_SYNONYM_CANONICAL[stripped] ??
    stripped
  );
}

export function expandCategoryIdsFromRows(
  rows: { id: string; name: string }[],
  categoryId: string,
): string[] {
  const needle = categoryId.trim().toLowerCase();
  const target = rows.find((r) => r.id.trim().toLowerCase() === needle);
  if (!target) return [needle];
  const key = categoryGroupKey(target.name);
  const ids = rows
    .filter((r) => categoryGroupKey(r.name) === key)
    .map((r) => r.id.trim().toLowerCase());
  return ids.length ? ids : [needle];
}

/** IDs de categoría equivalentes (misma etiqueta / sinónimo) para `WHERE category_id IN (...)`. */
export async function fetchExpandedCategoryIds(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<string[]> {
  const { data: rows } = await supabase.from("categories").select("id,name");
  return expandCategoryIdsFromRows(rows ?? [], categoryId);
}

/** Elige un id canónico por grupo (menor `sort_order`, desempate por nombre). */
export function pickCanonicalCategoryId(
  group: { id: string; name: string; sort_order: number }[],
): string | null {
  if (!group.length) return null;
  const sorted = [...group].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "es"),
  );
  return sorted[0]!.id;
}
