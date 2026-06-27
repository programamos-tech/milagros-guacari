import { VentasPageShell } from "@/components/admin/VentasPageBody";
import {
  currentYearMonthInReportStore,
  monthYmdBounds,
  prettyYearMonthLabel,
} from "@/lib/admin-report-range";
import type { VentaEstadoFilter, VentaPagoFilter } from "@/lib/ventas-sales";

export const dynamic = "force-dynamic";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function searchParamFirst(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function normalizeDateRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: string | null; to: string | null } {
  let f =
    fromRaw && YMD_RE.test(fromRaw.trim()) ? fromRaw.trim() : null;
  let t = toRaw && YMD_RE.test(toRaw.trim()) ? toRaw.trim() : null;
  if (f && t && f > t) {
    const x = f;
    f = t;
    t = x;
  }
  return { from: f, to: t };
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminVentasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = (typeof sp.q === "string" ? sp.q : "").trim();
  const status = (typeof sp.status === "string" ? sp.status : "all") as VentaEstadoFilter;
  const payment = (typeof sp.payment === "string" ? sp.payment : "all") as VentaPagoFilter;
  const { from: urlFrom, to: urlTo } = normalizeDateRange(
    searchParamFirst(sp.from),
    searchParamFirst(sp.to),
  );
  const pageRaw = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const hasExplicitDateOrQuery =
    qRaw.length > 0 || Boolean(urlFrom) || Boolean(urlTo);

  const currentMonth = currentYearMonthInReportStore();
  const monthBounds = monthYmdBounds(currentMonth);
  const defaultMonthApplied = !hasExplicitDateOrQuery && monthBounds != null;
  const dateFrom = hasExplicitDateOrQuery ? urlFrom : monthBounds?.from ?? null;
  const dateTo = hasExplicitDateOrQuery ? urlTo : monthBounds?.to ?? null;
  const periodLabel = defaultMonthApplied
    ? prettyYearMonthLabel(currentMonth)
    : null;

  return (
    <VentasPageShell
      qRaw={qRaw}
      status={status}
      payment={payment}
      urlFrom={urlFrom}
      urlTo={urlTo}
      dateFrom={dateFrom}
      dateTo={dateTo}
      defaultMonthApplied={defaultMonthApplied}
      periodLabel={periodLabel}
      pageRequested={pageRequested}
    />
  );
}
