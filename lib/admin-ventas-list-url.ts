import type { VentaEstadoFilter, VentaPagoFilter } from "@/lib/ventas-sales";

export type AdminVentasListUrlInput = {
  q?: string;
  status?: VentaEstadoFilter;
  payment?: VentaPagoFilter;
  from?: string | null;
  to?: string | null;
  page?: number;
};

/** Ruta interna del listado Ventas (misma semántica que la paginación del panel). */
export function buildAdminVentasListHref(input: AdminVentasListUrlInput): string {
  const params = new URLSearchParams();
  const q = input.q?.trim();
  if (q) params.set("q", q);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.payment && input.payment !== "all") params.set("payment", input.payment);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  if (input.page != null && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/admin/ventas?${qs}` : "/admin/ventas";
}

const RETURN_BASE = "https://__ventas-return.invalid";

/**
 * Acepta solo rutas relativas al listado `/admin/ventas` (evita redirecciones abiertas).
 */
export function safeAdminVentasListReturnPath(
  raw: string | string[] | undefined | null,
): string {
  const fallback = "/admin/ventas";
  const first =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && typeof raw[0] === "string"
        ? raw[0]
        : undefined;
  if (!first?.trim()) return fallback;
  let decoded = first.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }
  if (decoded.length > 2048) return fallback;
  try {
    const u = new URL(decoded, RETURN_BASE);
    if (u.origin !== RETURN_BASE || u.pathname !== "/admin/ventas") return fallback;
    return `${u.pathname}${u.search}`;
  } catch {
    return fallback;
  }
}
