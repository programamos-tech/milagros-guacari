import type { SupabaseClient } from "@supabase/supabase-js";
import { createdAtBoundsForReportYmdRange } from "@/lib/admin-report-range";
import {
  computeVentasFilterStats,
  type VentasFilterStats,
} from "@/lib/ventas-filter-stats";
import type { VentaEstadoFilter, VentaPagoFilter } from "@/lib/ventas-sales";

export type VentaOrderRow = {
  id: string;
  status: string;
  customer_name: string;
  total_cents: number;
  created_at: string;
  wompi_reference: string | null;
  customer_email: string | null;
};

/** Columnas presentes en prod y local (sin checkout_payment_method). */
const VENTAS_SELECT =
  "id,status,customer_name,total_cents,created_at,wompi_reference,customer_email";

const EMPTY_VENTAS_FILTER_STATS: VentasFilterStats = {
  totalCents: 0,
  cashCents: 0,
  transferCents: 0,
  mixedCents: 0,
  otherCents: 0,
  paidCount: 0,
};

type VentasFilterOpts = {
  q?: string;
  status: VentaEstadoFilter;
  payment: VentaPagoFilter;
  dateFrom: string | null;
  dateTo: string | null;
};

function sanitizeIlikeQuery(q: string): string {
  return q.replace(/[%_\\,]/g, "").trim().slice(0, 80);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyVentaPagoFilter(query: any, payment: VentaPagoFilter) {
  if (payment === "all") return query;
  if (payment === "cash") {
    return query.eq("wompi_reference", "POS:cash");
  }
  if (payment === "transfer") {
    return query.eq("wompi_reference", "POS:transfer");
  }
  if (payment === "mixed") {
    return query.eq("wompi_reference", "POS:mixed");
  }
  if (payment === "online") {
    return query.not("wompi_reference", "like", "POS:%");
  }
  return query;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyVentaTextFilter(query: any, q: string) {
  const term = sanitizeIlikeQuery(q);
  if (!term) return query;
  const pattern = `%${term}%`;
  const compact = term.replace(/-/g, "").toLowerCase();
  const orParts = [
    `customer_name.ilike.${pattern}`,
    `customer_email.ilike.${pattern}`,
  ];
  if (/^[0-9a-f-]{8,}$/i.test(term)) {
    orParts.push(`id.ilike.%${compact}%`);
  }
  return query.or(orParts.join(","));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyVentasFilters(query: any, opts: VentasFilterOpts) {
  if (opts.dateFrom || opts.dateTo) {
    const lo = opts.dateFrom ?? "1970-01-01";
    const hi = opts.dateTo ?? opts.dateFrom ?? "1970-01-01";
    const fromYmd = lo <= hi ? lo : hi;
    const toYmd = lo <= hi ? hi : lo;
    const bounds = createdAtBoundsForReportYmdRange(fromYmd, toYmd);
    if (bounds) {
      query = query.gte("created_at", bounds.gte).lt("created_at", bounds.lt);
    }
  }

  if (opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  query = applyVentaPagoFilter(query, opts.payment);

  if (opts.q?.trim()) {
    query = applyVentaTextFilter(query, opts.q);
  }

  return query;
}

function ventasDateBounds(opts: VentasFilterOpts): {
  gte: string | null;
  lt: string | null;
} {
  if (!opts.dateFrom && !opts.dateTo) {
    return { gte: null, lt: null };
  }
  const lo = opts.dateFrom ?? "1970-01-01";
  const hi = opts.dateTo ?? opts.dateFrom ?? "1970-01-01";
  const fromYmd = lo <= hi ? lo : hi;
  const toYmd = lo <= hi ? hi : lo;
  const bounds = createdAtBoundsForReportYmdRange(fromYmd, toYmd);
  if (!bounds) return { gte: null, lt: null };
  return { gte: bounds.gte, lt: bounds.lt };
}

function parseVentasFilterStatsRpc(raw: unknown): VentasFilterStats | null {
  if (raw == null) return null;
  let payload: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      payload = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    payload = raw as Record<string, unknown>;
  } else {
    return null;
  }

  return {
    totalCents: Number(payload.totalCents ?? 0),
    cashCents: Number(payload.cashCents ?? 0),
    transferCents: Number(payload.transferCents ?? 0),
    mixedCents: Number(payload.mixedCents ?? 0),
    otherCents: Number(payload.otherCents ?? 0),
    paidCount: Number(payload.paidCount ?? 0),
  };
}

async function fetchVentasFilterStatsFallback(
  supabase: SupabaseClient,
  opts: VentasFilterOpts,
): Promise<VentasFilterStats> {
  const { data, error } = await applyVentasFilters(supabase.from("orders"), opts).select(
    "status,total_cents,wompi_reference",
  ).limit(5000);

  if (error) {
    console.error("[ventas] fallback stats:", error.message);
    return EMPTY_VENTAS_FILTER_STATS;
  }

  const rows = (data ?? []) as {
    status: string;
    total_cents: number;
    wompi_reference: string | null;
  }[];

  if (rows.length >= 5000) {
    console.warn("[ventas] fallback stats truncado a 5000 filas");
  }

  return computeVentasFilterStats(rows);
}

async function fetchVentasFilterStats(
  supabase: SupabaseClient,
  opts: VentasFilterOpts,
): Promise<VentasFilterStats> {
  const { gte, lt } = ventasDateBounds(opts);
  const q = opts.q?.trim() ? sanitizeIlikeQuery(opts.q) : null;

  const { data, error } = await supabase.rpc("admin_ventas_filter_stats", {
    p_created_gte: gte,
    p_created_lt: lt,
    p_status: opts.status,
    p_payment: opts.payment,
    p_q: q,
  });

  if (!error) {
    const parsed = parseVentasFilterStatsRpc(data);
    if (parsed) return parsed;
    console.error("[ventas] admin_ventas_filter_stats: payload inválido");
  } else {
    console.error("[ventas] admin_ventas_filter_stats:", error.message);
  }

  return fetchVentasFilterStatsFallback(supabase, opts);
}

export type FetchAdminVentasPageOpts = VentasFilterOpts & {
  page: number;
  pageSize: number;
};

export type FetchAdminVentasPageResult = {
  rows: VentaOrderRow[];
  total: number;
  filterStats: VentasFilterStats;
  error: string | null;
};

export async function fetchAdminVentasPage(
  supabase: SupabaseClient,
  opts: FetchAdminVentasPageOpts,
): Promise<FetchAdminVentasPageResult> {
  const safePage = Math.max(1, Math.floor(opts.page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const listQuery = applyVentasFilters(supabase.from("orders"), opts)
    .select(VENTAS_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const [listRes, filterStats] = await Promise.all([
    listQuery,
    fetchVentasFilterStats(supabase, opts),
  ]);

  if (listRes.error) {
    return {
      rows: [],
      total: 0,
      filterStats,
      error: listRes.error.message,
    };
  }

  return {
    rows: (listRes.data ?? []) as VentaOrderRow[],
    total: listRes.count ?? 0,
    filterStats,
    error: null,
  };
}
