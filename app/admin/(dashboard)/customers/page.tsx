import Link from "next/link";
import { Suspense } from "react";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { CustomersSearchBar } from "@/components/admin/CustomersSearchBar";
import { CustomersPagination } from "@/components/admin/CustomersPagination";
import { AnimatedCopCents, AnimatedInteger } from "@/components/admin/ReportsAnimatedFigures";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { CustomerRowActions } from "@/components/admin/CustomerRowActions";
import {
  fetchAdminCustomersWithStats,
  type AdminCustomerListRow,
} from "@/lib/supabase/admin-customers-list";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CUSTOMERS_PAGE_SIZE = 20;

const customerCardClass =
  "flex h-full flex-col rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:shadow-none";

function searchParamFirst(
  v: string | string[] | undefined,
): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function matchesSearch(row: AdminCustomerListRow, q: string): boolean {
  if (!q) return true;
  const n = q.toLowerCase();
  const doc = row.documentId?.toLowerCase() ?? "";
  return (
    row.name.toLowerCase().includes(n) ||
    (row.email?.toLowerCase().includes(n) ?? false) ||
    (row.phone ?? "").toLowerCase().includes(n) ||
    doc.includes(n) ||
    (row.addressLine?.toLowerCase().includes(n) ?? false) ||
    (row.cityLine?.toLowerCase().includes(n) ?? false)
  );
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const q = searchParamFirst(sp.q)?.trim() ?? "";
  const pageRaw = Number.parseInt(searchParamFirst(sp.page) ?? "1", 10);
  const pageRequested =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const authPerm = await loadAdminPermissions();
  const canCreateCustomer = Boolean(authPerm?.permissions.clientes_crear);

  const supabase = await createSupabaseServerClient();
  const { rows: allRows, error, withoutShippingFields } =
    await fetchAdminCustomersWithStats(supabase);

  const filteredRows = q ? allRows.filter((r) => matchesSearch(r, q)) : allRows;
  const totalFiltered = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / CUSTOMERS_PAGE_SIZE));
  const page = Math.min(pageRequested, totalPages);
  const offset = (page - 1) * CUSTOMERS_PAGE_SIZE;
  const rows = filteredRows.slice(offset, offset + CUSTOMERS_PAGE_SIZE);

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  const filterLabelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400";

  const searchFieldClass =
    "w-full rounded-lg border border-zinc-200 bg-white bg-[url('data:image/svg+xml,%3Csvg+xmlns=%27http://www.w3.org/2000/svg%27+width=%2720%27+height=%2720%27+viewBox=%270+0+24+24%27+fill=%27none%27+stroke=%27%2371717a%27+stroke-width=%272%27%3E%3Ccircle+cx=%2711%27+cy=%2711%27+r=%278%27/%3E%3Cpath+d=%27m21+21-4.3-4.3%27/%3E%3C/svg%3E')] bg-[length:1.125rem] bg-[position:0.875rem_center] bg-no-repeat pl-10 pr-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-500 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-950 dark:bg-[url('data:image/svg+xml,%3Csvg+xmlns=%27http://www.w3.org/2000/svg%27+width=%2720%27+height=%2720%27+viewBox=%270+0+24+24%27+fill=%27none%27+stroke=%27%23a1a1aa%27+stroke-width=%272%27%3E%3Ccircle+cx=%2711%27+cy=%2711%27+r=%278%27/%3E%3Cpath+d=%27m21+21-4.3-4.3%27/%3E%3C/svg%3E')] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:shadow-none dark:focus:border-zinc-500 dark:focus:ring-zinc-600/40";

  const missingCustomersTable =
    error?.message?.toLowerCase().includes("customers") &&
    (error.message.includes("does not exist") ||
      error.message.includes("schema cache"));

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Clientes
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
            Un mismo registro para la tienda online y la física: alta manual o cuando compran en
            la web.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/customers"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
            title="Recargar listado"
          >
            Actualizar
          </Link>
          {canCreateCustomer ? (
            <Link
              href="/admin/customers/new"
              className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              + Nuevo cliente
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 py-6">
        {error ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100 dark:bg-amber-950/35 dark:text-amber-100 dark:ring-amber-800/50">
            <p className="font-medium">No se pudo cargar la lista de clientes.</p>
            {missingCustomersTable ? (
              <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
                Falta la tabla <code className="text-xs">customers</code>. En Supabase ejecuta la
                migración{" "}
                <code className="text-xs">20260512120000_customers_entity.sql</code> (o{" "}
                <code className="text-xs">supabase db push</code>).
              </p>
            ) : (
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                Revisa{" "}
                <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                y la clave, y que tu usuario admin tenga fila en{" "}
                <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
                  public.profiles
                </code>
                .
              </p>
            )}
          </div>
        ) : null}

        {!error && withoutShippingFields ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
            En la base todavía no están los campos de envío en pedidos. Puedes aplicar la
            migración{" "}
            <code className="text-xs">20260506120000_orders_shipping.sql</code> para
            completarlos.
          </p>
        ) : null}

        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-12 lg:col-span-8">
                <label className={filterLabelClass}>Buscar</label>
                <div
                  className="h-[42px] animate-pulse rounded-lg border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-800/60"
                  aria-hidden
                />
              </div>
            </div>
          }
        >
          <CustomersSearchBar
            initialQ={q}
            filterLabelClass={filterLabelClass}
            inputClassName={searchFieldClass}
          />
        </Suspense>

        {!error && totalFiltered === 0 ? (
          <div className="border-t border-zinc-100 py-12 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {allRows.length === 0
                ? "Todavía no hay clientes. Crea uno para la tienda física o espera la primera venta online."
                : "No hay resultados para esta búsqueda."}
            </p>
            {allRows.length === 0 ? (
              <Link
                href="/admin/customers/new"
                className="mt-4 inline-block text-sm font-semibold text-zinc-900 underline decoration-zinc-300 dark:text-zinc-100 dark:decoration-zinc-600"
              >
                Crear cliente
              </Link>
            ) : (
              <Link
                href="/admin/customers"
                className="mt-4 inline-block text-sm font-semibold text-zinc-900 underline decoration-zinc-300 dark:text-zinc-100 dark:decoration-zinc-600"
              >
                Limpiar búsqueda
              </Link>
            )}
          </div>
        ) : !error ? (
          <>
            {q && totalFiltered > 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                <AnimatedInteger
                  value={totalFiltered}
                  duration={800}
                  delay={60}
                  className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200"
                />{" "}
                {totalFiltered === 1 ? "cliente coincide" : "clientes coinciden"} con «{q}»
                {pageRequested > totalPages ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    {" "}
                    (página solicitada fuera de rango; mostrando la última)
                  </span>
                ) : null}
              </p>
            ) : null}
            {!q && totalFiltered > CUSTOMERS_PAGE_SIZE ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                <AnimatedInteger
                  value={totalFiltered}
                  duration={850}
                  delay={50}
                  className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200"
                />{" "}
                clientes en total
                {pageRequested > totalPages ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    {" "}
                    (página solicitada fuera de rango; mostrando la última)
                  </span>
                ) : null}
              </p>
            ) : null}
            {/* Con sidebar fijo, por debajo de xl la tabla fuerza scroll: tarjetas 1/2 cols (como Productos/Ventas). */}
            <ul
              role="list"
              className="grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-2 sm:gap-4 xl:hidden"
            >
              {rows.map((r, ri) => {
                const emailShow = r.email ?? "—";
                const avatarSeed = customerAvatarSeed(r.id, r.email);
                const docShow = r.documentId?.trim() ? r.documentId : "—";
                const phoneShow = r.phone?.trim() ? r.phone : "—";
                return (
                  <li key={r.id} className="min-w-0">
                    <article className={customerCardClass}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <CustomerAvatar
                            seed={avatarSeed}
                            size={44}
                            label={`Avatar de ${r.name}`}
                          />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/customers/${r.id}`}
                              className="line-clamp-2 font-semibold leading-snug text-zinc-900 hover:underline dark:text-zinc-100"
                            >
                              {r.name}
                            </Link>
                            {r.customerKind === "wholesale" ? (
                              <p className="mt-1">
                                <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100">
                                  Mayorista
                                  {r.wholesaleDiscountPercent > 0
                                    ? ` ${r.wholesaleDiscountPercent}%`
                                    : ""}
                                </span>
                              </p>
                            ) : null}
                            <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {docShow}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
                              {emailShow}
                            </p>
                          </div>
                        </div>
                        <CustomerRowActions
                          customerId={r.id}
                          lastOrderId={r.lastOrderId}
                          email={r.email ?? ""}
                        />
                      </div>
                      <p className="mt-3 text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                        Tel. {phoneShow}
                      </p>
                      <div className="mt-2 min-h-[2.5rem] text-xs text-zinc-600 dark:text-zinc-300">
                        {r.addressLine || r.cityLine ? (
                          <div className="line-clamp-3 leading-snug">
                            {r.addressLine ? <p>{r.addressLine}</p> : null}
                            {r.cityLine ? (
                              <p className="mt-0.5 text-zinc-400 dark:text-zinc-500">{r.cityLine}</p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">—</span>
                        )}
                      </div>
                      <p className="mt-auto pt-3 text-xs text-zinc-400 dark:text-zinc-500">
                        <span className="tabular-nums">
                          <AnimatedInteger
                            value={r.purchases}
                            duration={650}
                            delay={Math.min(ri * 24, 320)}
                            className="font-medium text-zinc-600 dark:text-zinc-300"
                          />{" "}
                          {r.purchases === 1 ? "compra" : "compras"} ·{" "}
                          <AnimatedCopCents
                            cents={r.totalSpent}
                            duration={720}
                            delay={Math.min(ri * 24 + 40, 360)}
                            className="font-medium text-zinc-700 dark:text-zinc-200"
                          />
                        </span>
                        {r.source === "manual" && r.purchases === 0 ? (
                          <span className="ml-1.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Manual
                          </span>
                        ) : null}
                      </p>
                    </article>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto border-t border-zinc-100 pt-4 dark:border-zinc-800 xl:block">
              <table className="w-full min-w-0 text-left text-sm xl:min-w-[960px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950/80">
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Cliente
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Doc.
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Email
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Teléfono
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Dirección
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, index) => {
                    const zebra =
                      index % 2 === 1
                        ? "bg-zinc-50/80 dark:bg-zinc-900/50"
                        : "bg-white dark:bg-zinc-900";
                    const emailShow = r.email ?? "—";
                    const avatarSeed = customerAvatarSeed(r.id, r.email);
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-zinc-100/90 ${zebra} transition hover:bg-zinc-100/60 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <CustomerAvatar
                              seed={avatarSeed}
                              size={40}
                              label={`Avatar de ${r.name}`}
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/admin/customers/${r.id}`}
                                className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                              >
                                {r.name}
                              </Link>
                              {r.customerKind === "wholesale" ? (
                                <p className="mt-1">
                                  <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100">
                                    Mayorista
                                    {r.wholesaleDiscountPercent > 0
                                      ? ` ${r.wholesaleDiscountPercent}%`
                                      : ""}
                                  </span>
                                </p>
                              ) : null}
                              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                <AnimatedInteger
                                  value={r.purchases}
                                  duration={650}
                                  delay={Math.min(index * 22, 300)}
                                  className="font-medium text-zinc-500 dark:text-zinc-400"
                                />{" "}
                                {r.purchases === 1 ? "compra" : "compras"} ·{" "}
                                <AnimatedCopCents
                                  cents={r.totalSpent}
                                  duration={720}
                                  delay={Math.min(index * 22 + 35, 340)}
                                  className="font-medium text-zinc-500 dark:text-zinc-400"
                                />
                                {r.source === "manual" && r.purchases === 0 ? (
                                  <span className="ml-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    Manual
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-zinc-600 dark:text-zinc-300">
                          {r.documentId?.trim() ? r.documentId : "—"}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3.5 text-zinc-600 dark:text-zinc-300">
                          {emailShow}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-zinc-600 dark:text-zinc-300">
                          {r.phone ?? "—"}
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-zinc-600 dark:text-zinc-300">
                          {r.addressLine || r.cityLine ? (
                            <div>
                              {r.addressLine ? (
                                <p className="leading-snug">{r.addressLine}</p>
                              ) : null}
                              {r.cityLine ? (
                                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                  {r.cityLine}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <CustomerRowActions
                            customerId={r.id}
                            lastOrderId={r.lastOrderId}
                            email={r.email ?? ""}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <CustomersPagination
              page={page}
              pageSize={CUSTOMERS_PAGE_SIZE}
              total={totalFiltered}
              buildHref={buildPageHref}
            />
          </>
        ) : null}
      </div>

      {!error && allRows.length > 0 ? (
        <p className="border-t border-zinc-100 py-4 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          Teléfono y dirección en la ficha son los guardados en el cliente. La última venta
          enlaza desde Acciones.
        </p>
      ) : null}
    </div>
  );
}
