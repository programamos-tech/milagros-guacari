import Link from "next/link";
import type { StoreCouponRow } from "@/lib/store-coupons";
import { formatStoreCouponVigenciaLabel } from "@/lib/store-coupons";

function yesNoBadge(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-900 ring-emerald-200/90 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60"
    : "bg-zinc-100 text-zinc-600 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600";
}

export function StoreCouponsTable({
  rows,
  restrictedProductCountById,
}: {
  rows: StoreCouponRow[];
  restrictedProductCountById: Map<string, number>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]">
      <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          Cupones registrados
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 sm:px-5">
          Todavía no hay cupones.{" "}
          <Link
            href="/admin/coupons/nuevo"
            className="font-semibold text-zinc-900 underline decoration-zinc-300 dark:text-zinc-100 dark:decoration-zinc-600"
          >
            Crear el primero
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-4 py-3 sm:px-5">Etiqueta</th>
                <th className="px-4 py-3 sm:px-5">Banner</th>
                <th className="px-4 py-3 sm:px-5">Código</th>
                <th className="px-4 py-3 text-right sm:px-5">%</th>
                <th className="px-4 py-3 sm:px-5">Ámbito</th>
                <th className="px-4 py-3 text-right sm:px-5">Orden</th>
                <th className="px-4 py-3 sm:px-5">Franja</th>
                <th className="px-4 py-3 sm:px-5">Activo</th>
                <th className="min-w-[200px] px-4 py-3 sm:px-5">Vigencia</th>
                <th className="px-4 py-3 text-right sm:px-5"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => {
                const n = restrictedProductCountById.get(row.id) ?? 0;
                return (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {row.internal_label?.trim() || "—"}
                    </p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-zinc-600 dark:text-zinc-300 sm:px-5">
                    <p className="line-clamp-2">{row.banner_message}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200 sm:px-5">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200 sm:px-5">
                    {row.discount_percent}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300 sm:px-5">
                    {n === 0 ? (
                      <span className="text-zinc-500 dark:text-zinc-400">Todo el carrito</span>
                    ) : (
                      <span>
                        {n} producto{n === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300 sm:px-5">
                    {row.sort_order}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${yesNoBadge(row.show_in_banner)}`}
                    >
                      {row.show_in_banner ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${yesNoBadge(row.is_enabled)}`}
                    >
                      {row.is_enabled ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 sm:px-5">
                    {formatStoreCouponVigenciaLabel(row.starts_at, row.ends_at)}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-5">
                    <Link
                      href={`/admin/coupons/${row.id}/edit`}
                      className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
