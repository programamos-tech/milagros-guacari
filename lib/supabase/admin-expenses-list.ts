import type { SupabaseClient } from "@supabase/supabase-js";
import {
  reportCalendarDayKeyFromIso,
  todayYmdInReportStore,
} from "@/lib/admin-report-range";

export type ExpenseRow = {
  id: string;
  concept: string;
  amount_cents: number;
  payment_method: string | null;
  notes: string | null;
  expense_date: string | null;
  created_at: string | null;
  is_cancelled: boolean | null;
  cancellation_reason: string | null;
};

const EXPENSES_DETAIL_SELECT =
  "id,concept,amount_cents,payment_method,notes,expense_date,created_at,is_cancelled,cancellation_reason";

/** Columnas mínimas para el fallback Node (sin RPC). */
const EXPENSES_AGG_SELECT = "amount_cents,is_cancelled,expense_date,created_at";

/** Tope del agregado fallback: un mes cabe de sobra. */
const EXPENSES_AGG_LIMIT = 5000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ExpensesFilterOpts = {
  q?: string;
  dateFrom: string | null;
  dateTo: string | null;
};

function sanitizeIlikeQuery(q: string): string {
  return q.replace(/[%_\\,]/g, "").trim().slice(0, 80);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyExpensesFilters(query: any, opts: ExpensesFilterOpts) {
  if (opts.dateFrom) query = query.gte("expense_date", opts.dateFrom);
  if (opts.dateTo) query = query.lte("expense_date", opts.dateTo);

  const raw = opts.q?.trim() ?? "";
  if (UUID_RE.test(raw)) {
    query = query.eq("id", raw);
  } else {
    const term = sanitizeIlikeQuery(raw);
    if (term.length > 0) {
      const pattern = `%${term}%`;
      query = query.or(`concept.ilike.${pattern},notes.ilike.${pattern}`);
    }
  }
  return query;
}

export type ExpensesFilterStats = {
  /** Suma de egresos NO anulados en el periodo filtrado (todas las páginas). */
  totalActivoCents: number;
  /** Suma de egresos NO anulados con fecha de hoy. */
  todayTotalCents: number;
  /** Cantidad de egresos anulados en el periodo. */
  cancelledCount: number;
  /** Total de filas que coinciden con el filtro (para paginación). */
  total: number;
};

const EMPTY_STATS: ExpensesFilterStats = {
  totalActivoCents: 0,
  todayTotalCents: 0,
  cancelledCount: 0,
  total: 0,
};

function parseEgresosFilterStatsRpc(raw: unknown): ExpensesFilterStats | null {
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
    totalActivoCents: Number(payload.totalActivoCents ?? 0),
    todayTotalCents: Number(payload.todayTotalCents ?? 0),
    cancelledCount: Number(payload.cancelledCount ?? 0),
    total: Number(payload.total ?? 0),
  };
}

async function fetchExpensesFilterStatsFallback(
  supabase: SupabaseClient,
  opts: ExpensesFilterOpts,
): Promise<ExpensesFilterStats> {
  function expenseCalendarYmd(e: {
    expense_date?: unknown;
    created_at?: unknown;
  }): string {
    const ed = e.expense_date;
    if (typeof ed === "string" && /^\d{4}-\d{2}-\d{2}/.test(ed.trim())) {
      return ed.trim().slice(0, 10);
    }
    const ca = e.created_at;
    if (typeof ca === "string" && ca.length > 0) {
      return reportCalendarDayKeyFromIso(ca);
    }
    return "";
  }

  const { data, error } = await applyExpensesFilters(
    supabase.from("store_expenses").select(EXPENSES_AGG_SELECT),
    opts,
  ).limit(EXPENSES_AGG_LIMIT);

  if (error) {
    console.error("[egresos] fallback stats:", error.message);
    return EMPTY_STATS;
  }

  const rows = (data ?? []) as {
    amount_cents: number;
    is_cancelled: boolean | null;
    expense_date: string | null;
    created_at: string | null;
  }[];

  if (rows.length >= EXPENSES_AGG_LIMIT) {
    console.warn("[egresos] fallback stats truncado a", EXPENSES_AGG_LIMIT, "filas");
  }

  const todayKey = todayYmdInReportStore();
  let totalActivoCents = 0;
  let todayTotalCents = 0;
  let cancelledCount = 0;

  for (const e of rows) {
    if (e.is_cancelled === true) {
      cancelledCount += 1;
      continue;
    }
    const amount = Math.max(0, Math.round(Number(e.amount_cents ?? 0)));
    totalActivoCents += amount;
    if (expenseCalendarYmd(e) === todayKey) todayTotalCents += amount;
  }

  return {
    totalActivoCents,
    todayTotalCents,
    cancelledCount,
    total: rows.length,
  };
}

async function fetchExpensesFilterStats(
  supabase: SupabaseClient,
  opts: ExpensesFilterOpts,
): Promise<ExpensesFilterStats> {
  const q = opts.q?.trim() ? sanitizeIlikeQuery(opts.q) : null;

  try {
    const { data, error } = await supabase.rpc("admin_egresos_filter_stats", {
      p_date_from: opts.dateFrom,
      p_date_to: opts.dateTo,
      p_q: q,
    });

    if (!error) {
      const parsed = parseEgresosFilterStatsRpc(data);
      if (parsed) return parsed;
      console.error("[egresos] admin_egresos_filter_stats: payload inválido");
    } else {
      console.error("[egresos] admin_egresos_filter_stats:", error.message);
    }
  } catch (err) {
    console.error("[egresos] admin_egresos_filter_stats exception:", err);
  }

  return fetchExpensesFilterStatsFallback(supabase, opts);
}

export type FetchAdminExpensesPageOpts = ExpensesFilterOpts & {
  page: number;
  pageSize: number;
};

export type FetchAdminExpensesPageResult = {
  rows: ExpenseRow[];
  stats: ExpensesFilterStats;
  error: string | null;
};

export async function fetchAdminExpensesPage(
  supabase: SupabaseClient,
  opts: FetchAdminExpensesPageOpts,
): Promise<FetchAdminExpensesPageResult> {
  const safePage = Math.max(1, Math.floor(opts.page));
  const safeSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize)));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  const listQuery = applyExpensesFilters(
    supabase.from("store_expenses").select(EXPENSES_DETAIL_SELECT),
    opts,
  )
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const [listRes, stats] = await Promise.all([
    listQuery,
    fetchExpensesFilterStats(supabase, opts),
  ]);

  if (listRes.error) {
    return { rows: [], stats, error: listRes.error.message };
  }

  return {
    rows: (listRes.data ?? []) as ExpenseRow[],
    stats,
    error: null,
  };
}
