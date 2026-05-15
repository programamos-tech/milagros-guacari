import { unitPriceAfterWholesaleCents } from "@/lib/customer-wholesale-pricing";
import { unitPriceGrossCents } from "@/lib/product-vat-price";
import { storefrontPriceAfterCouponCents } from "@/lib/store-coupons";

/** Precio de lista unitario con IVA (catálogo neto en BD). */
export function storefrontListGrossUnitCents(
  catalogNetCents: number,
  hasVat: boolean | null | undefined,
): number {
  return unitPriceGrossCents(catalogNetCents, hasVat, null);
}

/** Unitario a cobrar con IVA tras descuento mayorista (% sobre catálogo neto). */
export function storefrontPayableUnitGrossCents(
  catalogNetCents: number,
  hasVat: boolean | null | undefined,
  wholesaleDiscountPercent: number,
): number {
  const netUnit = unitPriceAfterWholesaleCents(
    catalogNetCents,
    wholesaleDiscountPercent,
  );
  return unitPriceGrossCents(netUnit, hasVat, null);
}

/** Unitario con IVA tras cupón % sobre el catálogo neto. */
export function storefrontUnitGrossAfterCouponCents(
  catalogNetCents: number,
  hasVat: boolean | null | undefined,
  couponDiscountPercent: number,
): number {
  const netAfter = storefrontPriceAfterCouponCents(
    catalogNetCents,
    couponDiscountPercent,
  );
  return unitPriceGrossCents(netAfter, hasVat, null);
}
