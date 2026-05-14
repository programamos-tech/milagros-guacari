"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus } from "lucide-react";
import {
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  addToCartFromForm,
  setLineQuantity,
} from "@/app/actions/cart";
import { useStoreCartDrawer } from "@/components/store/StoreCartDrawerProvider";
import { useStoreFavorites } from "@/components/store/StoreFavoritesProvider";
import { storeBrand } from "@/lib/brand";
import { formatCop } from "@/lib/money";
import {
  storefrontPriceAfterCouponCents,
} from "@/lib/store-coupons";
import { expandFragranceLabels } from "@/lib/fragrance-options";
import { catalogSizeSummaryLine } from "@/lib/product-size-options";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_path: string | null;
  stock_quantity: number;
  /** Columna opcional en DB; si falta se infiere para la línea de marca. */
  brand?: string | null;
  size_options?: unknown;
  size_value?: number | null;
  size_unit?: string | null;
  fragrance_options?: string[] | null;
};

function productRequiresFragranceChoice(product: Product): boolean {
  const raw = Array.isArray(product.fragrance_options)
    ? product.fragrance_options.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  return expandFragranceLabels(raw).length > 1;
}

function showcaseBrandLabel(product: Product): string {
  const b = product.brand?.trim();
  if (b) return b.toUpperCase();
  const beforeSep = product.name.split(/[•·|–—]/)[0]?.trim();
  if (beforeSep && beforeSep.length <= 32) return beforeSep.toUpperCase();
  return storeBrand.split(/\s+/)[0]?.toUpperCase() ?? "MARCA";
}

/** Tarjeta solo lectura: imagen + marca + nombre + precio (sin bordes ni CTAs en superficie). */
function ShowcaseProductCard({
  product,
  couponDiscountPercent = 0,
  accentImageBg = false,
}: {
  product: Product;
  couponDiscountPercent?: number;
  /** Fondo suave tipo bloque de color en algunas columnas (look editorial). */
  accentImageBg?: boolean;
}) {
  const img = storagePublicObjectUrl(product.image_path);
  const outOfStock = product.stock_quantity <= 0;
  const pct = Math.max(
    0,
    Math.min(100, Math.floor(Number(couponDiscountPercent) || 0)),
  );
  const hasCouponPrice = pct > 0;
  const priceAfterCoupon = hasCouponPrice
    ? storefrontPriceAfterCouponCents(product.price_cents, pct)
    : product.price_cents;

  const imageBgClass = accentImageBg
    ? "bg-[var(--store-image-well-tint)]"
    : "bg-[var(--store-image-well)]";

  return (
    <article className="h-full">
      <Link
        href={`/products/${product.id}`}
        className="group block outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]/35 focus-visible:ring-offset-2"
      >
        <div
          className={`relative aspect-[4/5] w-full shrink-0 overflow-hidden ${imageBgClass} transition-colors duration-300 ${
            outOfStock ? "opacity-[0.78]" : ""
          }`}
        >
          {img ? (
            <Image
              src={img}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
              unoptimized={shouldUnoptimizeStorageImageUrl(img)}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl text-stone-200">
              ◆
            </span>
          )}
        </div>
        <div className="space-y-1.5 pt-4 text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
            {showcaseBrandLabel(product)}
          </p>
          <p className="text-[13px] font-medium uppercase leading-snug tracking-wide text-[var(--store-brand)] line-clamp-3">
            {product.name}
          </p>
          <div className="space-y-0.5 pt-0.5">
            {hasCouponPrice ? (
              <>
                <p className="text-[11px] tabular-nums text-stone-400 line-through decoration-stone-300">
                  {formatCop(product.price_cents)}
                </p>
                <p className="text-[13px] font-medium tabular-nums text-stone-900">
                  {formatCop(priceAfterCoupon)}
                </p>
              </>
            ) : (
              <p className="text-[13px] font-medium tabular-nums text-stone-900">
                {formatCop(product.price_cents)}
              </p>
            )}
          </div>
          {outOfStock ? (
            <p className="pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">
              Agotado
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

function CatalogProductCard({
  product,
  cartQuantity = 0,
  onCartChange,
  couponDiscountPercent = 0,
  accentImageBg = false,
}: {
  product: Product;
  cartQuantity?: number;
  onCartChange?: () => void;
  couponDiscountPercent?: number;
  accentImageBg?: boolean;
}) {
  const router = useRouter();
  const { openCart } = useStoreCartDrawer();
  const [cartPending, startCartTransition] = useTransition();
  const { has, toggle, ready } = useStoreFavorites();
  const favorite = ready && has(product.id);
  const img = storagePublicObjectUrl(product.image_path);
  const outOfStock = product.stock_quantity <= 0;
  const sizeLine = catalogSizeSummaryLine(product);

  const afterCartMutation = () => {
    router.refresh();
    onCartChange?.();
  };

  const inCart = cartQuantity > 0;
  const maxQty = Math.max(0, Math.floor(product.stock_quantity));
  const pct = Math.max(
    0,
    Math.min(100, Math.floor(Number(couponDiscountPercent) || 0)),
  );
  const hasCouponPrice = pct > 0;
  const priceAfterCoupon = hasCouponPrice
    ? storefrontPriceAfterCouponCents(product.price_cents, pct)
    : product.price_cents;

  const titleWithSize = sizeLine ? `${product.name} · ${sizeLine}` : product.name;
  const needsFragranceOnPdp = productRequiresFragranceChoice(product);

  const imageBgClass = accentImageBg
    ? "bg-[var(--store-image-well-tint)]"
    : "bg-[var(--store-image-well)]";

  return (
    <article className="flex h-full flex-col">
      <div
        className={`relative aspect-[4/5] w-full shrink-0 overflow-hidden ${imageBgClass} transition-colors duration-300 ${outOfStock ? "opacity-[0.78]" : ""}`}
      >
        <Link
          href={`/products/${product.id}`}
          className="group/image absolute inset-0 block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--store-accent)]/40"
        >
          {img ? (
            <Image
              src={img}
              alt={product.name}
              fill
              className="object-cover object-center transition duration-300 group-hover/image:scale-[1.02]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={shouldUnoptimizeStorageImageUrl(img)}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-4xl text-stone-300">
              ◆
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggle(product.id);
          }}
          className={
            favorite
              ? "absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/95 text-[var(--store-accent)] shadow-none ring-1 ring-stone-200/80 transition hover:bg-white"
              : "absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/95 text-stone-600 shadow-none ring-1 ring-stone-200/80 transition hover:bg-white hover:text-stone-900"
          }
          aria-pressed={favorite}
          aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart
            className="size-3.5"
            strokeWidth={STORE_HEADER_ICON_STROKE}
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
        {hasCouponPrice ? (
          <span className="pointer-events-none absolute left-3 top-3 z-10 border border-[var(--store-accent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--store-accent)]">
            −{pct}%
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-1.5 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
          {showcaseBrandLabel(product)}
        </p>
        <Link
          href={`/products/${product.id}`}
          className="text-[13px] font-medium uppercase leading-snug tracking-wide text-[var(--store-brand)] transition hover:text-[var(--store-brand-hover)]"
        >
          <span className="line-clamp-3">{titleWithSize}</span>
        </Link>
        <div className="space-y-0.5 pt-0.5">
          {hasCouponPrice ? (
            <>
              <p className="text-[11px] tabular-nums text-stone-400 line-through decoration-stone-300">
                {formatCop(product.price_cents)}
              </p>
              <p className="text-[13px] font-medium tabular-nums text-stone-900">
                {formatCop(priceAfterCoupon)}
              </p>
              <p className="text-[9px] font-medium uppercase leading-tight tracking-[0.08em] text-stone-500">
                Con cupón en el pago
              </p>
            </>
          ) : (
            <p className="text-[13px] font-medium tabular-nums text-stone-900">
              {formatCop(product.price_cents)}
            </p>
          )}
        </div>

        {outOfStock ? (
          <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">
            Agotado
          </p>
        ) : needsFragranceOnPdp ? (
          <Link
            href={`/products/${product.id}`}
            className="mt-auto block border border-[var(--store-accent)] bg-white py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white"
          >
            Elegir fragancia
          </Link>
        ) : inCart ? (
          <div
            className="mt-auto flex w-full items-center gap-0.5 border border-[var(--store-accent)] bg-white p-0.5"
            role="group"
            aria-label="Cantidad en la bolsa"
          >
            <button
              type="button"
              disabled={cartPending}
              onClick={() =>
                startCartTransition(() => {
                  void setLineQuantity(product.id, cartQuantity - 1).then(
                    afterCartMutation,
                  );
                })
              }
              className="flex size-9 shrink-0 items-center justify-center text-[var(--store-accent)] transition hover:bg-[#fff4f8] disabled:opacity-40"
              aria-label={
                cartQuantity <= 1 ? "Quitar de la bolsa" : "Restar una unidad"
              }
            >
              <Minus className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
            <span className="min-w-0 flex-1 text-center text-xs font-semibold tabular-nums text-stone-900">
              {cartQuantity}
            </span>
            <button
              type="button"
              disabled={cartPending || cartQuantity >= maxQty}
              onClick={() =>
                startCartTransition(() => {
                  void setLineQuantity(product.id, cartQuantity + 1).then(
                    afterCartMutation,
                  );
                })
              }
              className="flex size-9 shrink-0 items-center justify-center text-[var(--store-accent)] transition hover:bg-[#fff4f8] disabled:opacity-40"
              aria-label="Sumar una unidad"
            >
              <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        ) : (
          <form
            className="mt-auto pt-4"
            action={async (formData) => {
              await addToCartFromForm(formData);
              afterCartMutation();
              openCart();
            }}
          >
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value="1" />
            <button
              type="submit"
              className="w-full bg-[var(--store-accent)] py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)]"
            >
              Añadir a la bolsa
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

export function ProductListingCard({
  product,
  cartQuantity = 0,
  onCartChange,
  couponDiscountPercent = 0,
  presentation = "default",
  accentImageBg = false,
}: {
  product: Product;
  cartQuantity?: number;
  onCartChange?: () => void;
  couponDiscountPercent?: number;
  presentation?: "default" | "editorial";
  accentImageBg?: boolean;
}) {
  if (presentation === "editorial") {
    return (
      <ShowcaseProductCard
        product={product}
        couponDiscountPercent={couponDiscountPercent}
        accentImageBg={accentImageBg}
      />
    );
  }

  return (
    <CatalogProductCard
      product={product}
      cartQuantity={cartQuantity}
      onCartChange={onCartChange}
      couponDiscountPercent={couponDiscountPercent}
      accentImageBg={accentImageBg}
    />
  );
}
