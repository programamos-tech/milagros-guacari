"use client";

import Image from "next/image";
import { ChevronDown, Heart, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { addToCartFromForm, buyNowFromDetail } from "@/app/actions/cart";
import { useStoreCartDrawer } from "@/components/store/StoreCartDrawerProvider";
import { useStoreFavorites } from "@/components/store/StoreFavoritesProvider";
import { formatCop } from "@/lib/money";
import {
  storefrontListGrossUnitCents,
  storefrontUnitGrossAfterCouponCents,
} from "@/lib/storefront-gross-price";
import { pseudoReviewCount } from "@/lib/pseudo-review";
import { shouldUnoptimizeStorageImageUrl } from "@/lib/storage-public-url";
import { productColorSwatchClass } from "@/lib/product-colors";

type Props = {
  productId: string;
  name: string;
  description: string | null;
  priceCents: number;
  stockQuantity: number;
  imageUrl: string | null;
  /** URLs públicas por etiqueta (misma clave que `fragrance_options`). */
  fragranceImageUrls: Record<string, string | null>;
  /** Presentaciones normalizadas (ej. `177 ml`, `400 ml`). */
  sizeLabels: string[];
  hasExpiration: boolean | null;
  expirationDate: string | null;
  colors: string[];
  fragranceOptions: string[];
  hasVat: boolean | null;
  vatPercent: number | null;
  couponDiscountPercent?: number;
};

function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-stone-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:opacity-90"
        aria-expanded={open}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900">
          {title}
        </span>
        <span className="text-lg font-light leading-none text-stone-400 tabular-nums">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="pb-5 text-sm leading-relaxed text-stone-600">{children}</div>
      ) : null}
    </div>
  );
}

function subscribePrefersReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getPrefersReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    () => false,
  );
}

export function ProductDetailView({
  productId,
  name,
  description,
  priceCents,
  stockQuantity,
  imageUrl,
  fragranceImageUrls,
  sizeLabels,
  hasExpiration,
  expirationDate,
  colors,
  fragranceOptions,
  hasVat,
  vatPercent: _legacyVatPercent,
  couponDiscountPercent = 0,
}: Props) {
  const router = useRouter();
  const { openCart } = useStoreCartDrawer();
  const { has, toggle, ready } = useStoreFavorites();
  const favorite = ready && has(productId);
  const [colorIdx, setColorIdx] = useState(0);
  const [fragranceIdx, setFragranceIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [heroLayout, setHeroLayout] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [heroZoom, setHeroZoom] = useState(false);
  const [heroZoomOrigin, setHeroZoomOrigin] = useState({ x: 50, y: 50 });
  const prefersReducedMotion = usePrefersReducedMotion();

  const reviews = pseudoReviewCount(productId);
  const outOfStock = stockQuantity <= 0;
  const maxQty = Math.max(0, Math.floor(stockQuantity));
  const safeQty =
    outOfStock || maxQty < 1 ? 1 : Math.min(Math.max(1, qty), maxQty);

  const pct = Math.max(
    0,
    Math.min(100, Math.floor(Number(couponDiscountPercent) || 0)),
  );
  const hasCouponPrice = pct > 0;
  const listGross = storefrontListGrossUnitCents(priceCents, hasVat);
  const displayPriceCents = hasCouponPrice
    ? storefrontUnitGrossAfterCouponCents(priceCents, hasVat, pct)
    : listGross;

  const sizeLabel =
    sizeLabels.length > 0 ? sizeLabels.join(" · ") : null;

  const colorOptions = colors.filter((c) => c.trim().length > 0);
  const fragranceLabels = fragranceOptions.filter((c) => c.trim().length > 0);
  const selectedColorLabel =
    colorOptions.length > 0 ? colorOptions[colorIdx] ?? colorOptions[0] : null;

  const heroImageUrl = useMemo(() => {
    if (fragranceLabels.length === 0) return imageUrl;
    const label =
      fragranceLabels[fragranceIdx] ?? fragranceLabels[0] ?? null;
    if (!label) return imageUrl;
    const mapped = fragranceImageUrls[label];
    return mapped ?? imageUrl;
  }, [fragranceIdx, fragranceLabels, fragranceImageUrls, imageUrl]);

  const selectedFragranceForCart =
    fragranceLabels.length > 0
      ? fragranceLabels[fragranceIdx] ?? fragranceLabels[0] ?? ""
      : "";

  const descriptionText = description?.trim() ?? "";
  const descPreviewLimit = 280;
  const showDescToggle = descriptionText.length > descPreviewLimit;
  const descriptionDisplayed =
    descriptionText &&
    showDescToggle &&
    !descExpanded
      ? `${descriptionText.slice(0, descPreviewLimit).trim()}…`
      : descriptionText;

  const unopt = shouldUnoptimizeStorageImageUrl(heroImageUrl);

  const heroFrameStyle = useMemo(() => {
    const natural =
      heroImageUrl &&
      heroLayout &&
      heroLayout.url === heroImageUrl &&
      heroLayout.width > 0 &&
      heroLayout.height > 0
        ? heroLayout
        : null;
    if (natural) {
      return {
        aspectRatio: `${natural.width} / ${natural.height}`,
      } as const;
    }
    return { minHeight: "clamp(280px, 62vw, 78vh)" } as const;
  }, [heroImageUrl, heroLayout]);

  const heroZoomScale =
    prefersReducedMotion || !heroZoom ? 1 : 1.9;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start">
      {/* Imagen — proporción natural (sin cuadrado fijo) + zoom al mover el cursor */}
      <div
        className="relative w-full overflow-hidden bg-[var(--store-image-well)] motion-safe:cursor-crosshair"
        style={heroFrameStyle}
        onMouseEnter={() => {
          if (!prefersReducedMotion) setHeroZoom(true);
        }}
        onMouseLeave={() => {
          setHeroZoom(false);
        }}
        onMouseMove={(e) => {
          if (prefersReducedMotion) return;
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
          const y = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
          setHeroZoomOrigin({ x, y });
        }}
      >
        {heroImageUrl ? (
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `scale(${heroZoomScale})`,
              transformOrigin: `${heroZoomOrigin.x}% ${heroZoomOrigin.y}%`,
              transition: prefersReducedMotion
                ? undefined
                : "transform 120ms ease-out",
            }}
          >
            <Image
              src={heroImageUrl}
              alt={name}
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              unoptimized={unopt}
              onLoad={(e) => {
                const img = e.currentTarget;
                const url = heroImageUrl;
                if (
                  url &&
                  img.naturalWidth > 0 &&
                  img.naturalHeight > 0
                ) {
                  setHeroLayout({
                    url,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center text-6xl text-stone-300">
            ◆
          </div>
        )}
        <button
          type="button"
          onClick={() => toggle(productId)}
          className={
            favorite
              ? "absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/95 text-[var(--store-accent)] shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white"
              : "absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-white hover:text-stone-900"
          }
          aria-pressed={favorite}
          aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <Heart
            className="size-[18px]"
            strokeWidth={1.35}
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Datos */}
      <div className="flex min-w-0 flex-col lg:max-w-xl lg:pt-2">
        <h1 className="text-xl font-semibold uppercase leading-snug tracking-[0.06em] text-[var(--store-brand)] sm:text-2xl">
          {name}
        </h1>

        <div className="mt-4">
          {hasCouponPrice ? (
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-stone-500">
              −{pct}% con cupón al pagar
            </p>
          ) : null}
          <p className="text-lg font-normal tabular-nums text-stone-900 sm:text-xl">
            {hasCouponPrice ? (
              <>
                <span className="mr-2 text-base text-stone-400 line-through decoration-stone-300">
                  {formatCop(listGross)}
                </span>
                <span>{formatCop(displayPriceCents)}</span>
              </>
            ) : (
              formatCop(listGross)
            )}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="flex text-amber-500" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className="size-[15px] fill-current"
                strokeWidth={0}
              />
            ))}
          </span>
          <span className="text-sm tabular-nums text-stone-500">({reviews})</span>
        </div>

        {outOfStock ? (
          <p className="mt-6 border-t border-stone-200/80 pt-6 text-sm font-medium uppercase tracking-wide text-stone-500">
            Agotado
          </p>
        ) : null}

        {colorOptions.length > 0 ? (
          <div className="mt-8">
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((color, i) => (
                <button
                  key={`${color}-${i}`}
                  type="button"
                  onClick={() => setColorIdx(i)}
                  className={`flex size-10 items-center justify-center rounded-full border-2 transition ${
                    colorIdx === i
                      ? "border-[var(--store-accent)] ring-2 ring-[var(--store-accent)] ring-offset-2"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                  aria-pressed={colorIdx === i}
                  aria-label={`Color ${color}`}
                >
                  <span
                    className={`size-6 rounded-full ${productColorSwatchClass(color)}`}
                  />
                </button>
              ))}
            </div>
            {selectedColorLabel ? (
              <p className="mt-3 text-[13px] text-stone-600">
                <span className="text-stone-500">Color:</span>{" "}
                {selectedColorLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        {fragranceLabels.length > 1 ? (
          <fieldset className="mt-8 min-w-0 border-0 p-0">
            <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900">
              Fragancia / tono
            </legend>
            <div className="relative mt-3">
              <select
                id={`fragrance-${productId}`}
                value={fragranceIdx}
                onChange={(e) => setFragranceIdx(Number(e.target.value))}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-stone-300 bg-white py-3 pl-4 pr-11 text-left text-[13px] text-stone-900 shadow-sm outline-none transition hover:border-stone-400 focus:border-[var(--store-accent)] focus:ring-2 focus:ring-[var(--store-accent)]/20"
                aria-label="Fragancia o tono"
              >
                {fragranceLabels.map((label, i) => (
                  <option key={`${i}-${label}`} value={i}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-stone-500"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
          </fieldset>
        ) : null}

        {!outOfStock ? (
          <form className="mt-10 space-y-4">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="quantity" value={String(safeQty)} />
            <input
              type="hidden"
              name="fragrance"
              value={selectedFragranceForCart}
            />

            <div className="flex max-w-xs items-center justify-between gap-4 border-b border-stone-200 pb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                Cantidad
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-lg text-stone-500 transition hover:text-[var(--store-accent)]"
                  onClick={() =>
                    setQty((q) => Math.max(1, Math.min(q, maxQty) - 1))
                  }
                  aria-label="Menos"
                >
                  −
                </button>
                <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-stone-900">
                  {safeQty}
                </span>
                <button
                  type="button"
                  className="text-lg text-stone-500 transition hover:text-[var(--store-accent)]"
                  onClick={() =>
                    setQty((q) => Math.min(maxQty, Math.max(1, q) + 1))
                  }
                  aria-label="Más"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="submit"
              formAction={async (formData) => {
                await addToCartFromForm(formData);
                router.refresh();
                openCart();
              }}
              className="w-full bg-[var(--store-accent)] py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--store-accent-hover)]"
            >
              Añadir a la bolsa
            </button>

            <button
              type="submit"
              formAction={buyNowFromDetail}
              className="w-full bg-transparent py-2 text-center text-sm text-stone-600 underline decoration-stone-300 underline-offset-[6px] transition hover:text-[var(--store-accent)]"
            >
              Comprar ahora
            </button>
          </form>
        ) : null}

        <div className="mt-12">
          <AccordionSection title="Descripción" defaultOpen>
            {descriptionText ? (
              <div className="space-y-2">
                <p className="whitespace-pre-wrap">{descriptionDisplayed}</p>
                {showDescToggle ? (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="text-sm font-medium text-[var(--store-accent)] underline decoration-[var(--store-accent)]/40 underline-offset-4"
                  >
                    {descExpanded ? "Ver menos" : "Leer más"}
                  </button>
                ) : null}
              </div>
            ) : (
              <p>
                Aún no hay descripción. Puedes sumar detalles desde el panel de
                administración.
              </p>
            )}
          </AccordionSection>

          <AccordionSection title="Detalles">
            <ul className="list-inside list-disc space-y-2 text-stone-600">
              {outOfStock ? (
                <li>
                  <span className="text-stone-800">Estado:</span> Agotado
                </li>
              ) : null}
              {sizeLabel ? (
                <li>
                  <span className="text-stone-800">Contenido / tamaño:</span>{" "}
                  {sizeLabel}
                </li>
              ) : null}
              {colorOptions.length > 0 ? (
                <li>
                  <span className="text-stone-800">Colores:</span>{" "}
                  {colorOptions.join(", ")}
                </li>
              ) : null}
              {hasExpiration ? (
                <li>
                  <span className="text-stone-800">Vencimiento:</span>{" "}
                  {expirationDate ?? "—"}
                </li>
              ) : null}
              {fragranceLabels.length > 0 ? (
                <li>
                  <span className="text-stone-800">Fragancias / tonos:</span>{" "}
                  {fragranceLabels.join(", ")}
                </li>
              ) : null}
            </ul>
          </AccordionSection>

          <AccordionSection title="Envíos y devoluciones">
            <p>
              Envíos a todo el país según disponibilidad. Cambios y devoluciones
              según políticas del comercio; consultá por WhatsApp antes de
              comprar si tienes dudas sobre talla o compatibilidad.
            </p>
          </AccordionSection>
        </div>

        <p className="mt-10 text-[13px] text-stone-500">
          <Link href="/products" className="text-stone-800 underline decoration-stone-300 underline-offset-4 hover:text-stone-950">
            Ver más
          </Link>
          <span className="mx-2 text-stone-300" aria-hidden>
            |
          </span>
          <Link href="/products" className="text-stone-800 underline decoration-stone-300 underline-offset-4 hover:text-stone-950">
            Productos
          </Link>
        </p>
      </div>
    </div>
  );
}
