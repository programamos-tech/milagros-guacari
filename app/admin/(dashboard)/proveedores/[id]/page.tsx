import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";
import { supplierInvoiceUiStatus } from "@/lib/supplier-invoices";
import { ClickableTableRow } from "@/components/admin/ClickableTableRow";
import { SupplierInvoiceStatusPill } from "@/components/admin/SupplierInvoiceStatusPill";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
};

function paidMap(
  rows: { invoice_id: string; amount_cents: number }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const id = r.invoice_id;
    m.set(id, (m.get(id) ?? 0) + Number(r.amount_cents ?? 0));
  }
  return m;
}

export default async function AdminProveedorDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const statusF = typeof sp.status === "string" ? sp.status : "all";

  const supabase = await createSupabaseServerClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle();
  if (!supplier) notFound();

  const { data: invoicesRaw } = await supabase
    .from("supplier_invoices")
    .select("id,folio,total_cents,issue_date,is_cancelled,created_at")
    .eq("supplier_id", id)
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false });

  const invoices = invoicesRaw ?? [];
  const invIds = invoices.map((i) => i.id);
  let payments: { invoice_id: string; amount_cents: number }[] = [];
  if (invIds.length > 0) {
    const { data: p } = await supabase
      .from("supplier_invoice_payments")
      .select("invoice_id,amount_cents")
      .in("invoice_id", invIds);
    payments = p ?? [];
  }
  const paidByInv = paidMap(payments);

  let pendingTotal = 0;
  const rows = invoices.map((inv) => {
    const total = Number(inv.total_cents ?? 0);
    const paid = paidByInv.get(inv.id) ?? 0;
    const pending = inv.is_cancelled ? 0 : Math.max(0, total - paid);
    if (!inv.is_cancelled) pendingTotal += pending;
    const st = supplierInvoiceUiStatus(total, paid, Boolean(inv.is_cancelled));
    return { ...inv, paid, pending, st };
  });

  const filtered = rows.filter((r) => {
    if (q && !r.folio.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q.replace(/-/g, ""))) {
      return false;
    }
    if (statusF !== "all" && r.st !== statusF) return false;
    return true;
  });

  const nFacturas = invoices.length;
  const subtitle = `${nFacturas} ${nFacturas === 1 ? "factura" : "facturas"} · Por pagar ${formatCop(pendingTotal)}`;

  const s = supplier as {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    document_id?: string | null;
    notes?: string | null;
  };
  const metaParts = [
    s.document_id?.trim() ? `NIT ${s.document_id.trim()}` : null,
    s.phone?.trim() ? s.phone.trim() : null,
    s.email?.trim() ? s.email.trim() : null,
  ].filter(Boolean);
  const metaLine =
    metaParts.length > 0 ? metaParts.join(" · ") : "Sin datos de contacto cargados.";
  const notesTrim = s.notes?.trim() ?? "";
  const avatarSeed = customerAvatarSeed(s.id, s.email);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <CustomerAvatar
            seed={avatarSeed}
            size={88}
            className="shadow ring-1 ring-zinc-200/90 dark:ring-zinc-600"
            label={`Avatar de ${String(s.name)}`}
          />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
              {s.name}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            <p className="mt-1.5 text-sm leading-snug text-zinc-600 dark:text-zinc-300">{metaLine}</p>
            {notesTrim ? (
              <p className="mt-1.5 max-w-2xl text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                {notesTrim}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/proveedores/${id}/nueva-factura`}
            className="inline-flex items-center justify-center rounded-lg border border-rose-950 bg-rose-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            + Nueva factura
          </Link>
          <Link
            href="/admin/proveedores"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-none dark:hover:bg-zinc-700"
          >
            ← Volver
          </Link>
        </div>
      </div>

      <form
        method="get"
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
            placeholder="Buscar por factura…"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:shadow-none dark:focus:border-zinc-500 dark:focus:ring-zinc-600/40"
          />
        </div>
        <select
          name="status"
          defaultValue={statusF}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:shadow-none dark:focus:border-zinc-500 dark:focus:ring-zinc-600/40 sm:w-48"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagada</option>
          <option value="cancelled">Anulada</option>
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
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/60">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Factura
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Emisión · hora
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
                    No hay facturas con ese criterio.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const createdAt =
                    typeof r.created_at === "string" ? new Date(r.created_at) : null;
                  const issue =
                    typeof r.issue_date === "string"
                      ? new Date(`${r.issue_date}T12:00:00Z`).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—";
                  const timeStr = createdAt
                    ? createdAt.toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";
                  return (
                    <ClickableTableRow
                      key={r.id}
                      href={`/admin/proveedores/${id}/facturas/${r.id}`}
                      ariaLabel={`Ver factura ${r.folio}`}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-200">{r.folio}</td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {issue}
                        <span className="text-zinc-400 dark:text-zinc-500"> · </span>
                        {timeStr}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCop(Number(r.total_cents ?? 0))}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatCop(r.paid)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-amber-800 dark:text-amber-400">
                        {formatCop(r.pending)}
                      </td>
                      <td className="px-3 py-2">
                        <SupplierInvoiceStatusPill
                          totalCents={Number(r.total_cents ?? 0)}
                          paidCents={r.paid}
                          isCancelled={Boolean(r.is_cancelled)}
                        />
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
