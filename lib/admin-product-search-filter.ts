/**
 * PostgREST `or` con `ilike`: los `%` en la URL rompen el parseo si no van en literal entre comillas.
 * @see https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering
 */
export function escapePostgrestOrQuotedLiteral(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '""');
}

/** `or=(name.ilike."%q%",reference.ilike."%q%")` — solo si la columna `reference` existe en el select. */
export function adminProductsNameReferenceOrIlikeFilter(qTrimmed: string): string {
  const inner = escapePostgrestOrQuotedLiteral(qTrimmed);
  return `name.ilike."%${inner}%",reference.ilike."%${inner}%"`;
}
