import { redirect } from "next/navigation";

/** Ruta legacy: el flujo de compra vive en `/checkout` (bolsa de compras). */
export default async function CartLegacyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : undefined;
  const allowed = new Set(["empty", "stock", "removed"]);
  if (err && allowed.has(err)) {
    redirect(`/checkout?error=${encodeURIComponent(err)}`);
  }
  redirect("/checkout");
}
