import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSupplierInvoiceAttachmentAction, uploadSupplierInvoiceAttachmentAction } from "@/app/actions/admin/suppliers";
import { SupplierAbonoForm } from "@/components/admin/SupplierAbonoForm";
import { SupplierCancelInvoiceButton } from "@/components/admin/SupplierCancelInvoiceButton";
import { SupplierInvoiceStatusPill } from "@/components/admin/SupplierInvoiceStatusPill";
import { formatCop } from "@/lib/money";
import {
  supplierLineGrossCents,
  supplierLineNetCents,
  supplierLineVatCents,
} from "@/lib/supplier-invoices";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { shouldUnoptimizeStorageImageUrl, storagePublicObjectUrl } from "@/lib/storage-public-url";

export const dynamic = "force-dynamic";

const detailCard =
  "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none";

type Props = {
  params: Promise<{ id: string; invoiceId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminProveedorFacturaDetailPage({ params, searchParams }: Props) {
  const { id: supplierId, invoiceId } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: supplier } = await supabase.from("suppliers").select("id,name").eq("id", supplierId).maybeSingle();
  const { data: inv } = await supabase
    .from("supplier_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (!supplier || !inv) notFound();

  const { data: pays } = await supabase
    .from("supplier_invoice_payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false });

  const { data: atts } = await supabase
    .from("supplier_invoice_attachments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  const { data: lineRows } = await supabase
    .from("supplier_invoice_lines")
    .select("id,product_name_snapshot,quantity,unit_price_cents,vat_rate_bps,sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  const payments = pays ?? [];
  const attachments = atts ?? [];
  const lines = lineRows ?? [];
  const lineFigures = lines.map((row) => {
    const q = Number(row.quantity ?? 0);
    const u = Number(row.unit_price_cents ?? 0);
    const vatBps = Math.max(0, Math.min(10000, Math.floor(Number(row.vat_rate_bps ?? 0))));
    const net = supplierLineNetCents(q, u);
    const vat = supplierLineVatCents(net, vatBps);
    const gross = supplierLineGrossCents(net, vatBps);
    return { row, q, u, vatBps, net, vat, gross };
  });
  const sumNet = lineFigures.reduce((s, x) => s + x.net, 0);
  const sumVat = lineFigures.reduce((s, x) => s + x.vat, 0);
  const sumGross = lineFigures.reduce((s, x) => s + x.gross, 0);
  const total = Number(inv.total_cents ?? 0);
  const paid = payments.reduce((s, p) => s + Number(p.amount_cents ?? 0), 0);
  const pending = inv.is_cancelled ? 0 : Math.max(0, total - paid);
  const issueStr =
    typeof inv.issue_date === "string"
      ? new Date(`${inv.issue_date}T12:00:00Z`).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  const err = sp.error;
  const errMsg =
    err === "monto"
      ? "El abono supera el saldo pendiente."
      : err === "abono"
        ? "No se pudo registrar el abono."
        : err === "limite"
          ? "Máximo 5 archivos adjuntos."
          : err === "subida" || err === "archivo"
            ? "Error al subir el archivo."
            : err === "db"
              ? "Error al guardar."
              : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/proveedores" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Proveedores
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <Link
              href={`/admin/proveedores/${supplierId}`}
              className="hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {supplier.name}
            </Link>
          </p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            ID de factura · {invoiceId.slice(0, 6)}
          </h1>
          <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-300">Folio {inv.folio}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SupplierAbonoForm
            invoiceId={invoiceId}
            supplierId={supplierId}
            pendingCents={pending}
          />
          <button
            type="button"
            disabled
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-500"
            title="Próximamente"
          >
            Editar
          </button>
          {!inv.is_cancelled ? (
            <SupplierCancelInvoiceButton supplierId={supplierId} invoiceId={invoiceId} />
          ) : null}
          <Link
            href={`/admin/proveedores/${supplierId}`}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Volver
          </Link>
        </div>
      </div>

      {errMsg ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
          {errMsg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <div className={`${detailCard} p-5`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Estado de la factura
            </p>
            <div className="mt-3">
              <SupplierInvoiceStatusPill
                totalCents={total}
                paidCents={paid}
                isCancelled={Boolean(inv.is_cancelled)}
              />
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              {lines.length > 0 ? (
                <>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Subtotal sin IVA</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                      {formatCop(sumNet)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">IVA</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                      {formatCop(sumVat)}
                    </dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Total</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCop(total)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Pagado</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCop(paid)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Pendiente</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-red-700 dark:text-red-400">
                  {formatCop(pending)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Notas</dt>
                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                  {inv.notes && String(inv.notes).trim() ? String(inv.notes).trim() : "Sin notas"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Número de factura</dt>
                <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">{inv.folio}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Emisión</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{issueStr}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="space-y-6 lg:col-span-8">
          <section className={`${detailCard} p-6`}>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Datos de la factura
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Proveedor y referencias.</p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Nombre</dt>
                <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">{supplier.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Número</dt>
                <dd className="mt-0.5 font-mono text-zinc-900 dark:text-zinc-100">{inv.folio}</dd>
              </div>
            </dl>
          </section>

          <section className={`${detailCard} p-6`}>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Productos / ítems
            </h2>
            {lines.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                Esta factura no tiene líneas de compra registradas (facturas anteriores a ítems o migración
                pendiente).
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                      <th className="py-2 pr-4 font-medium">Producto</th>
                      <th className="py-2 pr-3 font-medium tabular-nums">Cant.</th>
                      <th className="py-2 pr-3 font-medium tabular-nums">Unit. sin IVA</th>
                      <th className="py-2 pr-3 font-medium tabular-nums">IVA</th>
                      <th className="py-2 pr-3 font-medium tabular-nums">Neto</th>
                      <th className="py-2 pr-3 font-medium tabular-nums">Imp. IVA</th>
                      <th className="py-2 font-medium tabular-nums">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineFigures.map(({ row, q, u, vatBps, net, vat, gross }) => (
                      <tr
                        key={row.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {String(row.product_name_snapshot ?? "—")}
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-zinc-700 dark:text-zinc-300">{q}</td>
                        <td className="py-3 pr-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatCop(u)}
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                          {vatBps <= 0 ? "—" : `${vatBps / 100} %`}
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatCop(net)}
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatCop(vat)}
                        </td>
                        <td className="py-3 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCop(gross)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {lineFigures.length > 0 ? (
                    <tfoot>
                      <tr className="border-t border-zinc-200 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                        <td colSpan={4} className="py-3 pr-4 text-right text-zinc-500 dark:text-zinc-400">
                          Totales
                        </td>
                        <td className="py-3 pr-3 tabular-nums">{formatCop(sumNet)}</td>
                        <td className="py-3 pr-3 tabular-nums">{formatCop(sumVat)}</td>
                        <td className="py-3 tabular-nums">{formatCop(sumGross)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            )}
          </section>

          <section className={`${detailCard} p-6`}>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Abonos registrados
            </h2>
            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay abonos.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatCop(Number(p.amount_cents ?? 0))}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {typeof p.paid_at === "string"
                          ? new Date(p.paid_at).toLocaleString("es-CO")
                          : ""}{" "}
                        · {String(p.payment_method ?? "")}
                      </p>
                      {p.notes ? (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{String(p.notes)}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${detailCard} p-6`}>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Comprobantes
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Archivos adjuntos (imagen o PDF), hasta 5.
            </p>

            {!inv.is_cancelled && attachments.length < 5 ? (
              <form
                action={uploadSupplierInvoiceAttachmentAction}
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <input type="hidden" name="supplier_id" value={supplierId} />
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Archivo</label>
                  <input
                    name="file"
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    required
                    className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                >
                  Subir
                </button>
              </form>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {attachments.map((a) => {
                const url = storagePublicObjectUrl(a.storage_path);
                const isPdf = String(a.file_name ?? "").toLowerCase().endsWith(".pdf") || String(a.storage_path ?? "").toLowerCase().endsWith(".pdf");
                return (
                  <div
                    key={a.id}
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-950/50"
                  >
                    {url && !isPdf ? (
                      <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900">
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 400px"
                          unoptimized={shouldUnoptimizeStorageImageUrl(url)}
                        />
                      </div>
                    ) : url && isPdf ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-12 text-sm font-medium text-sky-700 underline dark:text-sky-400"
                      >
                        Ver PDF
                      </a>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
                      <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                        {a.file_name || "Archivo"}
                      </span>
                      <form action={deleteSupplierInvoiceAttachmentAction}>
                        <input type="hidden" name="attachment_id" value={a.id} />
                        <input type="hidden" name="invoice_id" value={invoiceId} />
                        <input type="hidden" name="supplier_id" value={supplierId} />
                        <input type="hidden" name="storage_path" value={a.storage_path} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                          title="Eliminar"
                        >
                          Quitar
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
            {attachments.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Sin comprobantes adjuntos.</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
