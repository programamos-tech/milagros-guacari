import { Suspense } from "react";
import { ReportsPeriodFilter } from "@/components/admin/ReportsPeriodFilter";
import { ReportsDashboardBody } from "@/components/admin/ReportsDashboardBody";
import {
  parseReportRangeFromSearchParams,
  prettyReportPeriodLabel,
  reportDataFetchYmdRange,
  reportSalesTrendWeekRanges,
  todayYmdInReportStore,
} from "@/lib/admin-report-range";
import { adminLandingPath } from "@/lib/admin-landing";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function ReportsDashboardSkeleton() {
  return (
    <div className="border-t border-rose-200/55 pt-10 pb-4 dark:border-zinc-800" role="status">
      <span className="sr-only">Cargando reportes…</span>
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/90 motion-reduce:animate-none" />
      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-zinc-200/50 bg-zinc-100/40 dark:border-zinc-700/50 dark:bg-zinc-900/40 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-2xl border border-rose-200/35 bg-white/50 dark:border-zinc-700/60 dark:bg-zinc-900/50 motion-reduce:animate-none sm:h-80" />
    </div>
  );
}

export default async function AdminHomePage({ searchParams }: PageProps) {
  const perm = await loadAdminPermissions();
  if (!perm) redirect("/admin/login");
  if (!perm.permissions.inicio_reportes) {
    redirect(adminLandingPath(perm.permissions));
  }

  const sp = await searchParams;
  const todayKey = todayYmdInReportStore();
  const { from: rangeFrom, to: rangeTo } = parseReportRangeFromSearchParams(
    sp,
    todayKey,
  );
  const periodLabel = prettyReportPeriodLabel(rangeFrom, rangeTo, todayKey);
  const {
    currentFrom: salesTrendCurrentFrom,
    currentTo: salesTrendCurrentTo,
    priorFrom: salesTrendPriorFrom,
    priorTo: salesTrendPriorTo,
    chartFrom,
    chartTo,
  } = reportSalesTrendWeekRanges(todayKey);
  const { fetchFrom, fetchTo } = reportDataFetchYmdRange(
    rangeFrom,
    rangeTo,
    chartFrom,
    chartTo,
  );

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4 sm:pb-10">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-rose-950 dark:text-zinc-100 sm:text-2xl md:text-3xl">
            Reportes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-rose-950/55 dark:text-zinc-400">
            Resumen ejecutivo y métricas de rendimiento de la tienda principal.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
          <ReportsPeriodFilter
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            todayKey={todayKey}
          />
        </div>
      </div>

      <Suspense
        key={`${rangeFrom}-${rangeTo}`}
        fallback={<ReportsDashboardSkeleton />}
      >
        <ReportsDashboardBody
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          chartFrom={chartFrom}
          chartTo={chartTo}
          salesTrendCurrentFrom={salesTrendCurrentFrom}
          salesTrendCurrentTo={salesTrendCurrentTo}
          salesTrendPriorFrom={salesTrendPriorFrom}
          salesTrendPriorTo={salesTrendPriorTo}
          fetchFrom={fetchFrom}
          fetchTo={fetchTo}
          periodLabel={periodLabel}
          todayKey={todayKey}
        />
      </Suspense>
    </div>
  );
}
