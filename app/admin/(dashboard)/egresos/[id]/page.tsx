import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { ExpenseDetailHeaderActions } from "@/components/admin/ExpenseDetailHeaderActions";
import { customerAvatarSeed } from "@/lib/customer-avatar-seed";
import { formatCop } from "@/lib/money";
import { formatStoreDateTime } from "@/lib/store-datetime-format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500";

const shellCard =
  "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]";

function paymentMethodLabel(raw: string) {
  switch (raw) {
    case "efectivo":
      return "Efectivo";
    case "transferencia":
      return "Transferencia";
    case "tarjeta":
      return "Tarjeta";
    case "otro":
      return "Otro";
    default:
      return raw || "—";
  }
}

function prettyDateTime(iso: string | null | undefined) {
  return formatStoreDateTime(iso, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

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

type Props = { params: Promise<{ id: string }> };

export default async function AdminEgresoDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("store_expenses")
    .select("id,concept,category,amount_cents,payment_method,notes,expense_date,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const concept = String(row.concept ?? "Egreso").trim() || "Egreso";
  const expenseDate =
    typeof row.expense_date === "string" && row.expense_date.length > 0
      ? row.expense_date
      : String(row.created_at ?? "").slice(0, 10);
  const createdAt = typeof row.created_at === "string" ? row.created_at : null;
  const paymentRaw = String(row.payment_method ?? "");
  const paymentPretty = paymentMethodLabel(paymentRaw);
  const category = String(row.category ?? "operativo");
  const notes = row.notes ? String(row.notes).trim() : "";
  const avatarSeed = customerAvatarSeed(row.id, concept);

  const metaParts = [
    paymentPretty,
    expenseDate,
    category !== "operativo" ? category : null,
  ].filter(Boolean);
  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : "Egreso operativo";

  const categoryIsLegacy = category.toLowerCase() === "legacy";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/admin/egresos"
          className="font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Egresos
        </Link>
        <span className="mx-2 text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">{concept}</span>
      </p>

      <div className={`${shellCard} overflow-hidden`}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <CustomerAvatar
              seed={avatarSeed}
              size={120}
              className="shadow-md ring-2 ring-zinc-200/90 dark:ring-zinc-600"
              label={`Identidad visual del egreso: ${concept}`}
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                {concept}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{metaLine}</p>
            </div>
          </div>
          <ExpenseDetailHeaderActions />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="grid divide-y divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <StatCol label="Monto" sub="Valor contable del egreso">
              {formatCop(Number(row.amount_cents ?? 0))}
            </StatCol>
            <StatCol label="Fecha del egreso" sub="Día asignado al gasto">
              {expenseDate}
            </StatCol>
            <StatCol label="Forma de pago" sub="Medio registrado">
              {paymentPretty}
            </StatCol>
            <StatCol label="Categoría" sub="Clasificación en base de datos">
              {categoryIsLegacy ? (
                <span className="text-violet-600 dark:text-violet-400">{category}</span>
              ) : (
                category
              )}
            </StatCol>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${shellCard} p-6 sm:p-8`}>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Notas y descripción
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Texto libre del registro (importación CSV, aclaraciones de IVA, etc.).
          </p>
          {notes.length > 0 ? (
            <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {notes}
              </p>
            </div>
          ) : (
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Sin notas adicionales
              </p>
              <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Este egreso solo tiene concepto y monto. Podés ampliar la información al crear
                nuevos registros desde el formulario.
              </p>
            </div>
          )}
        </section>

        <section className={`${shellCard} p-6 sm:p-8`}>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Trazabilidad
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Auditoría del registro en el sistema administrativo.
          </p>
          <ul className="mt-6 space-y-4 text-sm">
            <li>
              <p className={labelClass}>Registrado en el sistema</p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {prettyDateTime(createdAt)}
              </p>
            </li>
            <li>
              <p className={labelClass}>Identificador único</p>
              <p className="mt-1 break-all font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {String(row.id)}
              </p>
            </li>
            <li>
              <p className={labelClass}>Método de pago (código)</p>
              <p className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {paymentRaw || "—"}
              </p>
            </li>
          </ul>

          <div className="mt-8 flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Sin vínculo con pedidos
            </p>
            <p className="mt-2 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
              No se asocian a una venta concreta. En Reportes, el monto se descuenta del total de
              efectivo o de transferencia según el método de pago registrado aquí.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
