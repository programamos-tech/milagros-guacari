import { getPublicSiteUrl } from "@/lib/public-site-url";

export function buildStoreOrderTrackingUrl(orderId: string, token: string): string {
  const base = getPublicSiteUrl();
  const params = new URLSearchParams({
    order_id: orderId,
    t: token,
  });
  return `${base}/pedido?${params.toString()}`;
}
