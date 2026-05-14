import Link from "next/link";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { AnimatedCopCents, AnimatedInteger } from "@/components/admin/ReportsAnimatedFigures";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSupplierHubRows } from "@/lib/supplier-hub-aggregate";
import { supplierInvoiceStatusBadge } from "@/lib/supplier-invoices";
import { ClickableTableRow } from "@/components/admin/ClickableTableRow";
import { SupplierInvoiceStatusPill } from "@/components/admin/SupplierInvoiceStatusPill";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  status?: string;
};

export default async function AdminProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const statusFilter = typeof sp.status === "string" ? sp.status : "all";

  const supabase = await createSupabaseServerClient();
  let qSup = supabase.from("suppliers").select("id,name,email").order("name", { ascending: true });
  if (q.length > 0) {
    qSup = qSup.ilike("name", `%${q}%`);
  }
  const { data: suppliersRaw } = await qSup;
  const suppliers = suppliersRaw ?? [];

  const supplierIds = suppliers.map((s) => s.id);
  let invoices: {
    id: string;
    supplier_id: string;
    total_cents: number;
    is_cancelled: boolean;
  }[] = [];

  if (supplierIds.length > 0) {
    const { data: inv } = await supabase
      .from("supplier_invoices")
      .select("id,supplier_id,total_cents,is_cancelled")
      .in("supplier_id", supplierIds);
    invoices = (inv ?? []) as typeof invoices;
  }

  const invoiceIds = invoices.map((i) => i.id);
  let payments: { invoice_id: string; amount_cents: number }[] = [];
  if (invoiceIds.length > 0) {
    const { data: pay } = await supabase
      .from("supplier_invoice_payments")
      .select("invoice_id,amount_cents")
      .in("invoice_id", invoiceIds);
    payments = (pay ?? []) as typeof payments;
  }

  const hubRows = buildSupplierHubRows(suppliers, invoices, payments);
  const filtered =
    statusFilter === "all"
      ? hubRows
      : hubRows.filter((r) => r.rollUpStatus === statusFilter);

  const totalPorPagar = hubRows.reduce((s, r) => s + r.pendingCents, 0);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
              Facturas de proveedores
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60">
              Tienda principal
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-zinc-500 dark:text-zinc-400">
            Cuentas por pagar por proveedor: entra a un proveedor para ver sus facturas y el detalle de
            cada una.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="reports-metric-card rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
            style={{ ["--reports-stagger" as string]: "50ms" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Total por pagar
            </p>
            <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              <AnimatedCopCents cents={totalPorPagar} duration={1100} delay={70} />
            </p>
          </div>
          <Link
            href="/admin/proveedores"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800"
            aria-label="Actualizar"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v7h-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/admin/proveedores/nueva-factura"
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            + Nueva factura
          </Link>
          <Link
            href="/admin/proveedores/nuevo"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700"
          >
            Nuevo proveedor
          </Link>
        </div>
      </div>

      <form
        method="get"
        action="/admin/proveedores"
        className="flex flex-col gap-2 rounded-lg border border-zinc-200/90 bg-white p-3 shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Buscar proveedor…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:shadow-none dark:focus:border-zinc-500 dark:focus:ring-zinc-600/40"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:shadow-none dark:focus:border-zinc-500 dark:focus:ring-zinc-600/40 sm:w-48"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagada</option>
          <option value="cancelled">Anulado</option>
          <option value="empty">Sin facturas</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-rose-950 bg-rose-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/60">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Proveedor
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Facturas
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Total
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Pagado
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Pendiente
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Estado
                </th>
                <th className="w-11 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No hay proveedores con ese criterio.
                  </td>
                </tr>
              ) : (
                filtered.map((row, rowIndex) => {
                  const st =
                    row.rollUpStatus === "empty"
                      ? {
                          label: "Sin facturas",
                          className:
                            "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600",
                        }
                      : supplierInvoiceStatusBadge(row.rollUpStatus);
                  return (
                    <ClickableTableRow
                      key={row.id}
                      href={`/admin/proveedores/${row.id}`}
                      ariaLabel={`Ver proveedor ${row.name}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <CustomerAvatar
                            seed={customerAvatarSeed(row.id, row.email)}
                            size={36}
                            className="ring-1 ring-zinc-200/80 dark:ring-zinc-600"
                            label={`Avatar de ${row.name}`}
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                        <AnimatedInteger
                          value={row.invoiceCount}
                          duration={700}
                          delay={Math.min(rowIndex * 28, 360)}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-900 dark:text-zinc-100">
                        <AnimatedCopCents
                          cents={row.totalCents}
                          duration={720}
                          delay={Math.min(rowIndex * 28 + 20, 380)}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                        <AnimatedCopCents
                          cents={row.paidCents}
                          duration={720}
                          delay={Math.min(rowIndex * 28 + 40, 400)}
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-amber-800 dark:text-amber-400">
                        <AnimatedCopCents
                          cents={row.pendingCents}
                          duration={720}
                          delay={Math.min(rowIndex * 28 + 60, 420)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {row.rollUpStatus === "empty" ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${st.className}`}
                          >
                            {st.label}
                          </span>
                        ) : (
                          <SupplierInvoiceStatusPill
                            totalCents={row.totalCents}
                            paidCents={row.paidCents}
                            isCancelled={row.rollUpStatus === "cancelled"}
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400"
                          aria-hidden
                        >
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                      </td>
                    </ClickableTableRow>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
