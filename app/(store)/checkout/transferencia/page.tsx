import Link from "next/link";
import { notFound } from "next/navigation";
import { TransferenciaCheckoutPanel } from "@/components/store/TransferenciaCheckoutPanel";
import { getTransferBankInstructions } from "@/lib/transfer-bank-instructions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutTransferenciaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const orderId = typeof sp.order_id === "string" ? sp.order_id.trim() : "";
  const token = typeof sp.t === "string" ? sp.t.trim() : "";
  if (!orderId || !token) notFound();

  const supabase = createSupabaseServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, checkout_payment_method, transfer_session_token, status, total_cents, customer_name",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();
  if (String(order.checkout_payment_method) !== "transfer") notFound();
  if (String(order.transfer_session_token) !== token) notFound();

  const status = String(order.status);
  const instructions = getTransferBankInstructions();

  if (status !== "pending") {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
        <h1 className="text-xl font-semibold text-[var(--store-brand)]">Pedido actualizado</h1>
        <p className="text-sm leading-relaxed text-stone-600">
          Este pedido ya no está pendiente de pago; el enlace de transferencia dejó de ser válido.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cuenta/pedidos"
            className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--store-accent)] shadow-sm hover:bg-stone-50"
          >
            Mis pedidos
          </Link>
          <Link
            href="/products"
            className="inline-flex rounded-full bg-[var(--store-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--store-accent-hover)]"
          >
            Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-white">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
        <nav
          aria-label="Migas de pan"
          className="mb-8 text-[11px] uppercase tracking-[0.12em] text-stone-400"
        >
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="transition hover:text-stone-800">
                Inicio
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li>
              <Link href="/checkout" className="transition hover:text-stone-800">
                Bolsa
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li className="text-stone-600">Transferencia</li>
          </ol>
        </nav>

        <h1 className="text-center text-sm font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)] sm:text-left sm:text-[15px] sm:tracking-[0.26em]">
          Pago por transferencia
        </h1>

        <div className="mt-10">
          <TransferenciaCheckoutPanel
            orderId={orderId}
            token={token}
            totalCents={Number(order.total_cents ?? 0)}
            customerName={String(order.customer_name ?? "")}
            instructions={instructions}
          />
        </div>
      </div>
    </div>
  );
}
