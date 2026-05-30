import Link from "next/link";
import { ActivityLogCard } from "@/components/admin/ActivityLogCard";
import { CustomersPagination } from "@/components/admin/CustomersPagination";
import {
  fetchAdminActivityLogPage,
  type AdminActivityLogRow,
} from "@/lib/admin-activity-log";
import { REPORT_STORE_TIME_ZONE } from "@/lib/admin-report-range";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIVITIES_PAGE_SIZE = 25;

function searchParamFirst(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: REPORT_STORE_TIME_ZONE,
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function buildPageHref(page: number): string {
  if (page <= 1) return "/admin/actividades";
  return `/admin/actividades?page=${page}`;
}

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function AdminActividadesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const pageRaw = Number.parseInt(searchParamFirst(sp.page) ?? "1", 10);
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const supabase = await createSupabaseServerClient();
  let page = pageRequested;
  let { rows: list, total, error } = await fetchAdminActivityLogPage(supabase, {
    page,
    pageSize: ACTIVITIES_PAGE_SIZE,
  });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
        No se pudo cargar el registro de actividades. Aplica la migración{" "}
        <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
          20260523120000_admin_activity_log.sql
        </code>{" "}
        en Supabase.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / ACTIVITIES_PAGE_SIZE));
  if (page > totalPages && total > 0) {
    page = totalPages;
    ({ rows: list, total } = await fetchAdminActivityLogPage(supabase, {
      page,
      pageSize: ACTIVITIES_PAGE_SIZE,
    }));
  }

  const actorIds = [...new Set(list.map((r) => r.actor_id))];
  const { data: profs } =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, login_username")
          .in("id", actorIds)
      : { data: [] as { id: string; display_name: string | null; login_username: string | null }[] };

  const actorLabel = new Map<string, string>();
  for (const p of profs ?? []) {
    const id = p.id as string;
    const name =
      String(p.display_name ?? "").trim() ||
      String(p.login_username ?? "").trim() ||
      id.slice(0, 8);
    actorLabel.set(id, name);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Inicio
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Actividades</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Registro de actividades
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Trazabilidad de altas, cambios y movimientos registrados por el equipo en el
          panel.
          {total > 0 ? (
            <>
              {" "}
              <span className="text-zinc-600 dark:text-zinc-300">
                {total} {total === 1 ? "registro" : "registros"} en total.
              </span>
            </>
          ) : null}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200/90 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-400 dark:shadow-none dark:ring-white/[0.06]">
          Todavía no hay actividades registradas.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]">
          <ul className="space-y-1.5 p-2 sm:p-3">
            {list.map((row: AdminActivityLogRow) => {
              const actor = actorLabel.get(row.actor_id) ?? row.actor_id.slice(0, 8);
              return (
                <ActivityLogCard
                  key={row.id}
                  row={row}
                  actorDisplay={actor}
                  formatWhen={formatWhen}
                />
              );
            })}
          </ul>
          <CustomersPagination
            page={page}
            pageSize={ACTIVITIES_PAGE_SIZE}
            total={total}
            buildHref={buildPageHref}
          />
        </div>
      )}
    </div>
  );
}
