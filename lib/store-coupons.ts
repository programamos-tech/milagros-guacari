import type { SupabaseClient } from "@supabase/supabase-js";

export type StoreCouponRow = {
  id: string;
  internal_label: string | null;
  banner_message: string;
  code: string;
  discount_percent: number;
  is_enabled: boolean;
  show_in_banner: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreCouponBannerPayload = {
  id: string;
  banner_message: string;
  code: string;
};

export function storeCouponIsActiveAt(
  row: Pick<StoreCouponRow, "is_enabled" | "starts_at" | "ends_at">,
  at: Date = new Date(),
): boolean {
  if (!row.is_enabled) {
    return false;
  }
  const t = at.getTime();
  if (row.starts_at) {
    if (t < new Date(row.starts_at).getTime()) {
      return false;
    }
  }
  if (row.ends_at) {
    if (t > new Date(row.ends_at).getTime()) {
      return false;
    }
  }
  return true;
}

/**
 * Precio unitario en centavos tras aplicar % de cupón, con el mismo redondeo que en checkout
 * para un ítem aislado: descuento = round(precio × % / 100).
 */
export function storefrontPriceAfterCouponCents(
  priceCents: number,
  discountPercent: number,
): number {
  const p = Math.max(0, Math.min(100, Math.floor(discountPercent)));
  if (p <= 0) return priceCents;
  if (p >= 100) return 0;
  return Math.max(
    0,
    priceCents - Math.round((priceCents * p) / 100),
  );
}

/**
 * Por producto, el mayor % entre cupones vigentes que tengan al menos un producto vinculado
 * (solo esos cupones generan filas en `store_coupon_products`). Cupones “a todo el carrito”
 * sin vínculos no alteran el mapa.
 */
export async function fetchStorefrontCouponDiscountPercentByProductId(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("storefront_coupon_discounts");

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[store-coupons] storefront discount map:", error.message);
    }
    return {};
  }

  const out: Record<string, number> = {};
  for (const row of (data ?? []) as {
    product_id: string;
    discount_percent: number;
  }[]) {
    const pct = Math.max(
      0,
      Math.min(100, Math.floor(Number(row.discount_percent))),
    );
    if (pct > 0) {
      out[String(row.product_id)] = pct;
    }
  }
  return out;
}

/** Mayor % de cupón vigente vinculado a un único producto (p. ej. ficha). */
export async function fetchStorefrontCouponDiscountPercentForProduct(
  supabase: SupabaseClient,
  productId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "storefront_coupon_discount_for_product",
    { p_product_id: productId },
  );

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[store-coupons] storefront discount for product:",
        error.message,
      );
    }
    return 0;
  }

  const n = Number(data);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

/** Primer cupón elegible para el banner superior (orden + vigencia). */
export async function fetchBannerStoreCoupon(
  supabase: SupabaseClient,
): Promise<StoreCouponBannerPayload | null> {
  const { data, error } = await supabase
    .from("store_coupons")
    .select(
      "id, banner_message, code, is_enabled, show_in_banner, starts_at, ends_at, sort_order, created_at",
    )
    .eq("is_enabled", true)
    .eq("show_in_banner", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return null;
  }

  const now = new Date();
  for (const row of data) {
    if (
      storeCouponIsActiveAt(
        {
          is_enabled: row.is_enabled,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
        },
        now,
      )
    ) {
      return {
        id: row.id as string,
        banner_message: row.banner_message as string,
        code: row.code as string,
      };
    }
  }

  return null;
}

export type StoreCheckoutCouponMatch = {
  discount_percent: number;
  /** `null` = aplica al subtotal del carrito; si hay ids, solo a esas líneas. */
  eligible_product_ids: Set<string> | null;
};

/** Cupón aplicable al checkout (código + vigencia + habilitado). Usa cliente service o bypass RLS. */
export async function findActiveStoreCouponForCheckout(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<StoreCheckoutCouponMatch | null> {
  const needle = rawCode.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  const { data, error } = await supabase
    .from("store_coupons")
    .select("id, code, discount_percent, is_enabled, starts_at, ends_at")
    .eq("is_enabled", true);

  if (error || !data?.length) {
    return null;
  }

  for (const row of data) {
    const c = String(row.code ?? "").trim().toLowerCase();
    if (c !== needle) {
      continue;
    }
    if (
      storeCouponIsActiveAt({
        is_enabled: row.is_enabled,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
      })
    ) {
      const couponId = row.id as string;
      const { data: links } = await supabase
        .from("store_coupon_products")
        .select("product_id")
        .eq("coupon_id", couponId);
      const ids = (links ?? []).map((l) => String(l.product_id));
      return {
        discount_percent: Number(row.discount_percent),
        eligible_product_ids: ids.length === 0 ? null : new Set(ids),
      };
    }
  }

  return null;
}

export function storeCouponAdminErrorMessage(
  code: string | undefined,
): string | null {
  if (!code) return null;
  switch (code) {
    case "banner_message":
      return "El texto del banner es obligatorio.";
    case "code":
      return "El código del cupón es obligatorio.";
    case "id":
      return "No se encontró el cupón.";
    case "duplicate_code":
      return "Ya existe un cupón con ese código (sin distinguir mayúsculas).";
    case "db":
      return "No se pudo guardar. Revisa migraciones y permisos.";
    case "products_required":
      return "Con “solo productos seleccionados” tienes que agregar al menos un producto.";
    case "invalid_products":
      return "Algún producto elegido ya no existe. Quita la referencia y vuelve a agregarla.";
    default:
      return "No se pudo guardar el cupón.";
  }
}

/** Valor para `AdminDateInput`: día calendario UTC alineado con cómo guardamos inicio/fin de cupón. */
export function storeCouponToDateInputValue(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatStoreCouponVigenciaLabel(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt && !endsAt) return "Sin límite";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CO", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (startsAt && endsAt) return `${fmt(startsAt)} → ${fmt(endsAt)}`;
  if (startsAt) return `Desde ${fmt(startsAt)}`;
  return `Hasta ${fmt(endsAt!)}`;
}
