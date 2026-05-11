import Link from "next/link";
import { ActivityLogCard } from "@/components/admin/ActivityLogCard";
import type { AdminActivityLogRow } from "@/lib/admin-activity-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export default async function AdminActividadesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("admin_activity_log")
    .select(
      "id, created_at, actor_id, action_type, entity_type, entity_id, summary, metadata",
    )
    .order("created_at", { ascending: false })
    .limit(250);

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

  const list = (rows ?? []) as AdminActivityLogRow[];
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
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200/90 bg-white px-5 py-10 text-center text-sm text-zinc-500 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-400 dark:shadow-none dark:ring-white/[0.06]">
          Todavía no hay actividades registradas.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((row) => {
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
      )}
    </div>
  );
}
