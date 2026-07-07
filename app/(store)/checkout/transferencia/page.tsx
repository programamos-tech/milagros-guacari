import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Compatibilidad: redirige al detalle público del pedido. */
export default async function CheckoutTransferenciaRedirectPage({
  searchParams,
}: Props) {
  const sp = await searchParams;
  const orderId = typeof sp.order_id === "string" ? sp.order_id.trim() : "";
  const token = typeof sp.t === "string" ? sp.t.trim() : "";
  if (!orderId || !token) {
    redirect("/checkout");
  }
  redirect(`/pedido?order_id=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`);
}
