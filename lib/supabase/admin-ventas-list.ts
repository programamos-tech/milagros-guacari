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
  checkout_payment_method?: string | null;
};

const VENTAS_SELECT =
  "id,status,customer_name,total_cents,created_at,wompi_reference,customer_email,checkout_payment_method";

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
    return query.or(
      "wompi_reference.eq.POS:transfer,checkout_payment_method.eq.transfer",
    );
  }
  if (payment === "mixed") {
    return query.eq("wompi_reference", "POS:mixed");
  }
  if (payment === "online") {
    return query
      .not("wompi_reference", "like", "POS:%")
      .or("checkout_payment_method.is.null,checkout_payment_method.neq.transfer");
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

  if (!error && data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    return {
      totalCents: Number(d.totalCents ?? 0),
      cashCents: Number(d.cashCents ?? 0),
      transferCents: Number(d.transferCents ?? 0),
      mixedCents: Number(d.mixedCents ?? 0),
      otherCents: Number(d.otherCents ?? 0),
      paidCount: Number(d.paidCount ?? 0),
    };
  }

  const statsRes = await applyVentasFilters(supabase.from("orders"), opts).select(
    "status,total_cents,wompi_reference",
  );
  return computeVentasFilterStats(
    (statsRes.data ?? []) as {
      status: string;
      total_cents: number;
      wompi_reference: string | null;
    }[],
  );
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
