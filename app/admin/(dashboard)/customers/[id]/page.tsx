import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerDetailHeaderActions } from "@/components/admin/CustomerDetailHeaderActions";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { fetchAdminCustomerDetail } from "@/lib/supabase/admin-customer-detail";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/money";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import {
  averageTicketByMonthFromPaidOrders,
  averageTicketByCalendarDayFromPaidOrders,
  ticketTrendMonthOverMonthPercent,
} from "@/lib/customer-ticket-trend";
import { ventaFormaPagoBadge, ventaNumeroReferencia } from "@/lib/ventas-sales";
import { CustomerTicketTrendChart } from "@/components/admin/CustomerTicketTrendChart";
import { adminPanelLgClass } from "@/lib/admin-ui";
import { isDomicilioOrder } from "@/lib/customer-order-classification";

export const dynamic = "force-dynamic";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

/** Títulos de sección alineados al listado de clientes (tracking + zinc). */
const sectionTitleClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400";

/** Métricas: misma base que las tarjetas del listado (`customerCardClass`), sin hover. */
const detailMetricCardClass =
  "flex flex-col gap-1.5 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-white/[0.06]";

const iconMutedClass = "size-6 shrink-0 text-zinc-500 dark:text-zinc-400";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function IconBag(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={props.className} aria-hidden>
      <path d="M6 7h12l-1 12H7L6 7Z" strokeLinejoin="round" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={props.className} aria-hidden>
      <path d="M14 18V6H3v12h2.5" strokeLinecap="round" />
      <path d="M14 9h3l3 3v6h-2.5" strokeLinejoin="round" />
      <circle cx="7.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </svg>
  );
}

function IconStore(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={props.className} aria-hidden>
      <path d="M4 10V20h16V10" strokeLinejoin="round" />
      <path d="M3 8 12 3l9 5" strokeLinejoin="round" />
      <path d="M9 20V12h6v8" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={props.className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l3 2" strokeLinecap="round" />
    </svg>
  );
}

function IconCoin(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={props.className} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 6v12M9 9.5h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h5" strokeLinecap="round" />
    </svg>
  );
}

function IconMedal(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={props.className} aria-hidden>
      <path d="M8 3h8l2 5-6 4-6-4 2-5Z" strokeLinejoin="round" />
      <path d="M12 12v3M9 21h6l-1.5-3h-3L9 21Z" strokeLinejoin="round" />
    </svg>
  );
}

function whatsappHref(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 8) return null;
  const withCc = d.startsWith("57") ? d : `57${d}`;
  return `https://wa.me/${withCc}`;
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
  const ticketTrendMonthly = averageTicketByMonthFromPaidOrders(ordersPaid);
  const trendPct = ticketTrendMonthOverMonthPercent(ticketTrendMonthly);
  const ticketTrendPoints = averageTicketByCalendarDayFromPaidOrders(ordersPaid, 150);
  const domiCount = ordersPaid.filter((o) => isDomicilioOrder(o)).length;
  const tiendaCount = Math.max(0, ventas - domiCount);
  const puntosRef = ventas > 0 ? Math.round(totalCents / 10000) : 0;

  const lastPaidAt = ordersPaid[0]?.created_at;
  const lastPurchaseLabel =
    typeof lastPaidAt === "string"
      ? formatStoreDateTime(lastPaidAt, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const msSincePurchase =
    typeof lastPaidAt === "string" ? Date.now() - new Date(lastPaidAt).getTime() : null;
  const activoReciente =
    ventas > 0 && msSincePurchase != null && msSincePurchase < 395 * 24 * 60 * 60 * 1000;

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

  const fullAddressText = [
    ...addressBlocks.map((a) => [a.label, a.address_line, a.reference].filter(Boolean).join(" · ")),
    cityPostal,
  ]
    .filter(Boolean)
    .join("\n");

  const phoneDigits = customer.phone?.replace(/\D/g, "") ?? "";
  const wa = customer.phone?.trim() && customer.phone !== "—" ? whatsappHref(customer.phone) : null;

  const birthLabel =
    customer.birth_date != null && String(customer.birth_date).trim() !== ""
      ? new Date(`${customer.birth_date}T12:00:00`).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
        })
      : null;

  const recentPaid = ordersPaid.slice(0, 18);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {sp.error === "delete" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          No se pudo eliminar el cliente. Intenta de nuevo.
        </div>
      ) : null}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/customers" className="font-medium hover:text-zinc-800 dark:hover:text-zinc-200">
          Clientes
        </Link>
        <span className="mx-2 text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">{customer.name}</span>
      </p>

      <div className={`${adminPanelLgClass} overflow-hidden`}>
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <CustomerAvatar
              seed={avatarSeed}
              size={112}
              className="shadow-sm ring-1 ring-zinc-200/90 dark:ring-zinc-600"
              label={`Avatar de ${customer.name}`}
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                {customer.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-md border border-rose-950/20 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-950 dark:border-rose-400/25 dark:bg-rose-950/35 dark:text-rose-100">
                  Cliente
                </span>
                {ventas > 0 ? (
                  <span
                    className={
                      activoReciente
                        ? "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-100 dark:ring-emerald-800/50"
                        : "inline-flex rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600"
                    }
                  >
                    {activoReciente ? "Activo" : "Inactivo"}
                  </span>
                ) : (
                  <span className="inline-flex rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600">
                    Sin compras
                  </span>
                )}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cliente desde{" "}
                  {formatStoreDateTime(customer.created_at, {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
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

          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-end lg:w-auto lg:flex-col lg:items-end">
            {ventas > 0 ? (
              <div
                className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:ring-white/[0.06]"
                title="Referencia visual: miles de pesos gastados (total ÷ $10.000)."
              >
                <IconMedal className="size-8 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-rose-950 dark:text-rose-200">
                    {puntosRef.toLocaleString("es-CO")}{" "}
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">puntos</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Según volumen de compra</p>
                </div>
              </div>
            ) : null}
            <CustomerDetailHeaderActions customerId={id} customerName={customer.name} />
          </div>
        </div>

        <div className="border-t border-zinc-100 px-4 py-5 dark:border-zinc-800 sm:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className={detailMetricCardClass}>
              <IconBag className={iconMutedClass} />
              <p className={labelClass}>Compras</p>
              <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{ventas}</p>
            </div>
            <div className={detailMetricCardClass}>
              <IconTruck className={iconMutedClass} />
              <p className={labelClass}>Domicilio</p>
              <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{domiCount}</p>
            </div>
            <div className={detailMetricCardClass}>
              <IconStore className={iconMutedClass} />
              <p className={labelClass}>Tienda / retiro</p>
              <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{tiendaCount}</p>
            </div>
            <div className={detailMetricCardClass}>
              <IconCoin className={iconMutedClass} />
              <p className={labelClass}>Gastado</p>
              <p className="text-xl font-semibold tabular-nums text-rose-950 dark:text-rose-200">
                {ventas > 0 ? formatCop(totalCents) : "—"}
              </p>
            </div>
            <div className={detailMetricCardClass}>
              <IconCoin className={iconMutedClass} />
              <p className={labelClass}>Ticket promedio</p>
              <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {ticketCents !== null ? formatCop(ticketCents) : "—"}
              </p>
            </div>
            <div className={detailMetricCardClass}>
              <IconClock className={iconMutedClass} />
              <p className={labelClass}>Última compra</p>
              <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{lastPurchaseLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {ticketTrendPoints.length > 0 ? (
        <section className={`${adminPanelLgClass} overflow-hidden`}>
          <div className="px-6 pt-6 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <h2 className={sectionTitleClass}>Ticket por día</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                  Ticket promedio por día en que hubo ventas pagadas (últimos ~150 días; si no hay
                  datos ahí, se muestra todo el historial). El porcentaje arriba sigue comparando el
                  promedio mensual del último mes contra el anterior.
                </p>
              </div>
              {trendPct != null ? (
                <div
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums ring-1 ring-zinc-200/90 dark:ring-zinc-600 ${
                    trendPct >= 0
                      ? "bg-zinc-50 text-emerald-800 dark:bg-zinc-800/80 dark:text-emerald-300"
                      : "bg-rose-50/90 text-rose-950 dark:bg-rose-950/25 dark:text-rose-200"
                  }`}
                >
                  <span aria-hidden>{trendPct >= 0 ? "↑" : "↓"}</span>
                  {trendPct >= 0 ? "+" : ""}
                  {trendPct}% <span className="font-normal text-zinc-500 dark:text-zinc-400">vs mes ant.</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="w-full min-w-0">
            <CustomerTicketTrendChart points={ticketTrendPoints} seriesKind="day" />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className={`${adminPanelLgClass} p-6 sm:p-8`}>
            <h2 className={sectionTitleClass}>Contacto</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {customer.email?.trim() ? (
                <a
                  href={`mailto:${customer.email.trim()}`}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 transition hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path d="M4 6h16v12H4z" strokeLinejoin="round" />
                      <path d="m4 7 8 6 8-6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>Email</p>
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{customer.email.trim()}</p>
                  </div>
                </a>
              ) : null}

              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 transition hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>WhatsApp</p>
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{customer.phone?.trim()}</p>
                  </div>
                </a>
              ) : null}

              {customer.phone?.trim() && customer.phone !== "—" ? (
                <a
                  href={`tel:${phoneDigits}`}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 transition hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path d="M6.5 3h3l1 4.5-2.2 1.3a12 12 0 0 0 5.9 5.9L16.5 12 21 13v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>Teléfono</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{customer.phone.trim()}</p>
                  </div>
                </a>
              ) : null}

              {customer.document_id?.trim() ? (
                <div className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06]">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path d="M8 7V5a4 4 0 0 1 8 0v2M5 9h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>Documento</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{customer.document_id.trim()}</p>
                  </div>
                </div>
              ) : null}

              {birthLabel ? (
                <div className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06]">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>Cumpleaños</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{birthLabel}</p>
                  </div>
                </div>
              ) : null}

              {fullAddressText ? (
                <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06]">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
                      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" strokeLinejoin="round" />
                      <circle cx="12" cy="11" r="2.5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className={labelClass}>Dirección</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                      {fullAddressText}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {!customer.email?.trim() && !customer.phone?.trim() && !fullAddressText && !customer.document_id?.trim() && !birthLabel ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Sin datos de contacto registrados.</p>
            ) : null}
          </section>

          <section className={`${adminPanelLgClass} p-6 sm:p-8`}>
            <h2 className={sectionTitleClass}>Top productos</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Por cantidad en pedidos pagados (con totales del ítem al momento de la venta).
            </p>
            {topProducts.length === 0 ? (
              <div className="mt-6 flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Sin datos aún</p>
                <p className="mt-2 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                  Cuando haya ventas pagadas con ítems, verás el ranking aquí.
                </p>
              </div>
            ) : (
              <ol className="mt-5 space-y-3">
                {topProducts.slice(0, 8).map((row, i) => (
                  <li
                    key={`${row.name}-${i}`}
                    className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06]"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-900 text-xs font-bold text-white dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{row.name}</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{row.quantity} u.</span>
                        {" · "}
                        <span className="tabular-nums text-rose-950 dark:text-rose-200">{formatCop(row.totalCents)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section className={`${adminPanelLgClass} flex max-h-[min(720px,70vh)] flex-col p-6 sm:p-8`}>
          <h2 className={sectionTitleClass}>Últimas compras</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Ventas pagadas, más recientes primero.</p>
          {recentPaid.length === 0 ? (
            <div className="mt-6 flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Aún no hay compras pagadas.</p>
            </div>
          ) : (
            <ul className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
              {recentPaid.map((o) => {
                const ref = ventaNumeroReferencia(o.id);
                const created =
                  typeof o.created_at === "string"
                    ? formatStoreDateTime(o.created_at, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "—";
                const pago = ventaFormaPagoBadge(o.wompi_reference);
                const pagoLabel = pago.label === "Transferencia" ? "Transfer." : pago.label;
                const nProd = o.line_count ?? 0;
                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/5 transition hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-0.5 text-zinc-500 dark:text-zinc-400" aria-hidden>
                            <IconStore className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">#{ref}</p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{created}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-right text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatCop(Number(o.total_cents ?? 0))}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {nProd > 0 ? `${nProd} prod.` : "— prod."}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pago.className}`}>
                          {pagoLabel}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section
        id="historial"
        className={`${adminPanelLgClass} flex w-full min-w-0 flex-col p-6 sm:p-8`}
      >
        <div className="shrink-0">
          <h2 className={sectionTitleClass}>Historial de pedidos</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Todos los estados (incluye pendientes y cancelados).{" "}
            <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
              {customerOrders.length}
            </span>{" "}
            en total. La lista se desplaza aquí para no alargar la página.
          </p>
        </div>
        {customerOrders.length === 0 ? (
          <div className="mt-6 flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Aún no hay pedidos vinculados.</p>
          </div>
        ) : (
          <div
            className="mt-6 min-h-0 w-full min-w-0 max-h-[min(68vh,640px)] overflow-y-auto overscroll-y-contain rounded-xl border border-zinc-200/90 bg-zinc-50/30 shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.04)] dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none"
            role="region"
            aria-label="Listado de pedidos con scroll"
            tabIndex={0}
          >
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {customerOrders.map((o, rowIdx) => {
                const ref = ventaNumeroReferencia(o.id);
                const created =
                  typeof o.created_at === "string"
                    ? formatStoreDateTime(o.created_at, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";
                const st = orderStatusLabel[o.status] ?? o.status;
                const pago = ventaFormaPagoBadge(o.wompi_reference);
                return (
                  <li
                    key={o.id}
                    className={
                      rowIdx % 2 === 0
                        ? "bg-white dark:bg-zinc-900"
                        : "bg-zinc-50/90 dark:bg-zinc-900/80"
                    }
                  >
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-rose-50/40 dark:hover:bg-zinc-800/70"
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
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{pago.label}</p>
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
          </div>
        )}
      </section>
    </div>
  );
}
