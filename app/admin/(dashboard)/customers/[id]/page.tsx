import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerDetailHeaderActions } from "@/components/admin/CustomerDetailHeaderActions";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { fetchAdminCustomerDetail } from "@/lib/supabase/admin-customer-detail";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";
import { averageTicketByMonthFromPaidOrders } from "@/lib/customer-ticket-trend";
import { ventaFormaPagoLabel, ventaNumeroReferencia } from "@/lib/ventas-sales";
import { CustomerTicketTrendChart } from "@/components/admin/CustomerTicketTrendChart";

export const dynamic = "force-dynamic";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500";

const shellCard =
  "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function StatCol({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-5 sm:px-5">
      <p className={labelClass}>{label}</p>
      <div className="mt-1 text-2xl font-semibold tabular-nums leading-tight text-zinc-900 dark:text-zinc-100">
        {children}
      </div>
      {sub ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p> : null}
    </div>
  );
}

export default async function AdminCustomerDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { detail, error } = await fetchAdminCustomerDetail(supabase, id);

  if (error && error.message?.toLowerCase().includes("customers")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
        No se pudo cargar el cliente. Revisa migraciones y permisos.
      </div>
    );
  }

  if (!detail) notFound();

  const {
    customer,
    addresses,
    ordersPaid,
    customerOrders,
    topProducts,
    matchedOrdersByEmailFallback,
  } = detail;

  const orderStatusLabel: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    failed: "Fallido",
    cancelled: "Cancelado",
  };

  const avatarSeed = customerAvatarSeed(customer.id, customer.email);
  const ventas = ordersPaid.length;
  const totalCents = ordersPaid.reduce((s, o) => s + Number(o.total_cents ?? 0), 0);
  const ticketCents = ventas > 0 ? Math.round(totalCents / ventas) : null;
  const ticketTrendPoints = averageTicketByMonthFromPaidOrders(ordersPaid);

  const metaParts = [
    customer.document_id?.trim() ? `CC ${customer.document_id.trim()}` : null,
    customer.phone?.trim() && customer.phone !== "—" ? customer.phone.trim() : null,
    customer.email?.trim() ? customer.email.trim() : null,
  ].filter(Boolean);
  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : "Sin datos de contacto";

  const addressBlocks =
    addresses.length > 0
      ? addresses
      : customer.shipping_address?.trim()
        ? [
            {
              id: "primary-shipping",
              label: "Principal",
              address_line: customer.shipping_address.trim(),
              reference: "",
              sort_order: 0,
            },
          ]
        : [];

  const cityPostal = [customer.shipping_city, customer.shipping_postal_code]
    .filter((x) => String(x ?? "").trim())
    .join(customer.shipping_city && customer.shipping_postal_code ? " · " : "");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {sp.error === "delete" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          No se pudo eliminar el cliente. Intenta de nuevo.
        </div>
      ) : null}

      {/* Breadcrumb fuera del card (mockup) */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/customers" className="font-medium hover:text-zinc-800 dark:hover:text-zinc-200">
          Clientes
        </Link>
        <span className="mx-2 text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">{customer.name}</span>
      </p>

      {/* Card de título: identidad + acciones; debajo métricas con columnas y divisores */}
      <div className={`${shellCard} overflow-hidden`}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <CustomerAvatar
              seed={avatarSeed}
              size={120}
              className="shadow-md ring-2 ring-zinc-200/90 dark:ring-zinc-600"
              label={`Avatar de ${customer.name}`}
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                {customer.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{metaLine}</p>
              {matchedOrdersByEmailFallback ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Algunos pedidos se enlazan por email (sin{" "}
                  <code className="rounded bg-amber-100 px-1 text-[11px] dark:bg-amber-900/50">
                    customer_id
                  </code>
                  ).
                </p>
              ) : null}
            </div>
          </div>
          <CustomerDetailHeaderActions customerId={id} customerName={customer.name} />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="grid divide-y divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <StatCol
              label="Ticket promedio"
              sub={`${ventas} ${ventas === 1 ? "venta" : "ventas"}`}
            >
              {ticketCents !== null ? formatCop(ticketCents) : "—"}
            </StatCol>
            <StatCol label="Total comprado">
              {ventas > 0 ? formatCop(totalCents) : "—"}
            </StatCol>
            <StatCol label="Garantías" sub="Devoluciones procesadas">
              <span className="text-violet-600 dark:text-violet-400">0</span>
            </StatCol>
            <div className="px-4 py-5 sm:px-5">
              <p className={labelClass}>Direcciones</p>
              {addressBlocks.length > 0 ? (
                <div className="mt-2 space-y-3 text-sm leading-snug text-zinc-800 dark:text-zinc-200">
                  {addressBlocks.map((a) => (
                    <div key={a.id}>
                      <span
                        className={
                          a.label.trim().toLowerCase() === "principal"
                            ? "inline-block rounded-md bg-sky-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-sky-500"
                            : "inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }
                      >
                        {a.label}
                      </span>
                      <p className="mt-1.5">{a.address_line}</p>
                      {a.reference?.trim() ? (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          Ref: {a.reference.trim()}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {cityPostal ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{cityPostal}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-2xl font-semibold text-zinc-300 dark:text-zinc-600">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {ticketTrendPoints.length > 0 ? (
        <section className={`${shellCard} p-6 sm:p-8`}>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Evolución del ticket promedio
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Por mes (ventas pagadas): cuánto gasta el cliente de promedio por compra en cada mes.
            Sirve para ver si el ticket sube, baja o se mantiene.
          </p>
          <CustomerTicketTrendChart points={ticketTrendPoints} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${shellCard} p-6 sm:p-8`}>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Facturas
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pedidos vinculados a este cliente (POS, tienda en línea y mismos datos de contacto).
          </p>
          {customerOrders.length === 0 ? (
            <div className="mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-zinc-300 dark:text-zinc-600"
                aria-hidden
              >
                <path d="M3 3v18h18" />
                <path d="M7 16v3M11 13v6M15 10v9M19 7v12" />
              </svg>
              <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Aún no hay pedidos vinculados a este cliente.
              </p>
              <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Las ventas deben guardarse con este cliente seleccionado o con el mismo correo que
                figura en la ficha.
              </p>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-zinc-100 rounded-xl border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
              {customerOrders.map((o) => {
                const ref = ventaNumeroReferencia(o.id);
                const created =
                  typeof o.created_at === "string"
                    ? new Date(o.created_at).toLocaleString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";
                const st = orderStatusLabel[o.status] ?? o.status;
                const pago = ventaFormaPagoLabel(o.wompi_reference);
                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          Factura #{ref}
                          <span
                            className={`ml-2 inline-flex rounded-md px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide ${
                              o.status === "paid"
                                ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60"
                                : o.status === "pending"
                                  ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/55"
                                  : o.status === "cancelled"
                                    ? "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600"
                                    : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600"
                            }`}
                          >
                            {st}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{created}</p>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{pago}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatCop(Number(o.total_cents ?? 0))}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${shellCard} p-6 sm:p-8`}>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Top productos comprados
          </h2>
          {topProducts.length === 0 ? (
            <>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Ranking por cantidad cuando haya pedidos pagados con ítems.
              </p>
              <div className="mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Sin datos aún</p>
                <p className="mt-2 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                  Cuando las ventas incluyan ítems por producto, aquí verás el top de este cliente.
                </p>
              </div>
            </>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {topProducts.map((row, i) => (
                <li
                  key={`${row.name}-${i}`}
                  className="flex items-center justify-between gap-2 py-3 text-sm first:pt-0"
                >
                  <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-200">
                    {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                    {row.quantity} u.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
