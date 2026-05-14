const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;

export type AdminProductsListQuery = {
  q?: string;
  status?: string;
  category_id?: string;
  page?: number;
  per_page?: number;
  /** Abre el modal de gestión de categorías sobre el listado de productos. */
  categories?: boolean;
};

export function clampAdminProductsPageSize(raw: number): number {
  if (ALLOWED_PAGE_SIZES.includes(raw as (typeof ALLOWED_PAGE_SIZES)[number])) {
    return raw;
  }
  return 25;
}

/** Lee query string de Next (searchParams). */
export function parseAdminProductsPage(
  sp: Record<string, string | string[] | undefined>,
): number {
  const v = sp.page;
  const s = typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parseAdminProductsPerPage(
  sp: Record<string, string | string[] | undefined>,
): number {
  const v = sp.per_page;
  const s = typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
  const n = Math.floor(Number(s));
  return clampAdminProductsPageSize(Number.isFinite(n) ? n : 25);
}

export function parseAdminProductsCategoriesModal(
  sp: Record<string, string | string[] | undefined>,
): boolean {
  const v = sp.categories;
  const s = typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
  return s === "1" || s === "true";
}

export function adminProductsListHref(q: AdminProductsListQuery): string {
  const params = new URLSearchParams();
  const search = (q.q ?? "").trim();
  if (search) params.set("q", search);
  const st = (q.status ?? "all").trim() || "all";
  if (st !== "all") params.set("status", st);
  const cat = (q.category_id ?? "").trim();
  if (cat) params.set("category_id", cat);
  const per = clampAdminProductsPageSize(q.per_page ?? 25);
  if (per !== 25) params.set("per_page", String(per));
  const pg = Math.max(1, Math.floor(q.page ?? 1));
  if (pg > 1) params.set("page", String(pg));
  if (q.categories) params.set("categories", "1");
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

/** URL del listado sin params de toast (`saved`, `uploadError`). */
export function adminProductsUrlWithoutFlash(
  sp: Record<string, string | string[] | undefined>,
): string {
  const qRaw = sp.q;
  const q = typeof qRaw === "string" ? qRaw : Array.isArray(qRaw) ? qRaw[0] ?? "" : "";
  const statusRaw = sp.status;
  const status =
    typeof statusRaw === "string" ? statusRaw : Array.isArray(statusRaw) ? statusRaw[0] ?? "all" : "all";
  const catRaw = sp.category_id;
  const category_id =
    typeof catRaw === "string" ? catRaw : Array.isArray(catRaw) ? catRaw[0] ?? "" : "";
  return adminProductsListHref({
    q,
    status,
    category_id,
    page: parseAdminProductsPage(sp),
    per_page: parseAdminProductsPerPage(sp),
    categories: parseAdminProductsCategoriesModal(sp),
  });
}
