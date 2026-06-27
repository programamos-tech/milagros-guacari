"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { formatCop } from "@/lib/money";
import type { StoreCartUpsellProduct } from "@/lib/store-cart-upsells";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

export function CartUpsellList({
  products,
  title = "Complementa tu compra",
  subtitle,
  layout = "stack",
  onAdded,
}: {
  products: StoreCartUpsellProduct[];
  title?: string;
  subtitle?: string;
  layout?: "stack" | "scroll" | "bump";
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>(
    {},
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedVariant((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const product of products) {
        if (product.variantOptions.length > 0 && !next[product.id]) {
          next[product.id] = product.variantOptions[0]!;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [products]);

  const handleQuickAdd = useCallback(
    (product: StoreCartUpsellProduct) => {
      const variant = product.variantOptions.length
        ? selectedVariant[product.id] ?? product.variantOptions[0]
        : undefined;

      setPendingId(product.id);
      startTransition(() => {
        void (async () => {
          try {
            await addToCart(product.id, 1, variant);
            onAdded?.();
            router.refresh();
          } finally {
            setPendingId(null);
          }
        })();
      });
    },
    [onAdded, router, selectedVariant],
  );

  if (products.length === 0) return null;

  const listClass =
    layout === "scroll"
      ? "store-cart-suggestions-scroll -mx-1 flex list-none gap-3 px-1 pb-2"
      : layout === "bump"
        ? "space-y-3"
        : "divide-y divide-stone-200/90";

  const itemClass =
    layout === "scroll"
      ? "w-[8.75rem] shrink-0"
      : layout === "bump"
        ? "rounded-xl border border-stone-200/90 bg-white p-3"
        : "py-4 first:pt-0 last:pb-0";

  const titleId = title ? "cart-upsell-title" : undefined;

  return (
    <section aria-labelledby={titleId}>
      {title ? (
        <h2
          id={titleId}
          className={
            layout === "bump"
              ? "text-[13px] font-semibold leading-snug text-stone-900"
              : "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]"
          }
        >
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p
          className={
            layout === "bump"
              ? "mt-1 text-[12px] leading-relaxed text-stone-500"
              : "mt-1 text-[12px] leading-relaxed text-stone-500"
          }
        >
          {subtitle}
        </p>
      ) : null}
      <ul className={`${title || subtitle ? "mt-4" : ""} ${listClass}`}>
        {products.map((product) => {
          const img = storagePublicObjectUrl(product.imagePath);
          const busy = isPending && pendingId === product.id;
          const hasVariants = product.variantOptions.length > 1;

          if (layout === "bump") {
            return (
              <li key={product.id} className={itemClass}>
                <div className="flex gap-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#f4f4f3]"
                  >
                    {img ? (
                      <Image
                        src={img}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-stone-300">
                        ◆
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--store-brand)]"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-[12px] font-medium tabular-nums text-stone-900">
                        {formatCop(product.priceCents)}
                      </p>
                    </div>
                    {hasVariants ? (
                      <label className="block">
                        <span className="sr-only">Fragancia o tono</span>
                        <select
                          value={selectedVariant[product.id] ?? product.variantOptions[0]}
                          onChange={(e) =>
                            setSelectedVariant((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                          className="w-full border border-stone-200 bg-white px-2 py-1.5 text-[11px] text-stone-800 focus:border-[var(--store-accent)] focus:outline-none"
                        >
                          {product.variantOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleQuickAdd(product)}
                    className="h-fit shrink-0 self-center rounded-md bg-[var(--store-accent)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy ? "…" : "Agregar"}
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={product.id} className={itemClass}>
              <div
                className={
                  layout === "scroll"
                    ? "flex h-full flex-col"
                    : "flex gap-4"
                }
              >
                <Link
                  href={`/products/${product.id}`}
                  className={
                    layout === "scroll"
                      ? "block"
                      : "relative size-20 shrink-0 bg-[#f0eeeb] sm:size-[5.5rem]"
                  }
                >
                  {layout === "scroll" ? (
                    <div className="relative aspect-square w-full overflow-hidden bg-[#f4f4f3]">
                      {img ? (
                        <Image
                          src={img}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="140px"
                          unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-stone-300">
                          ◆
                        </div>
                      )}
                    </div>
                  ) : img ? (
                    <Image
                      src={img}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="88px"
                      unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-stone-300">
                      ◆
                    </div>
                  )}
                </Link>

                <div
                  className={
                    layout === "scroll"
                      ? "flex flex-1 flex-col pt-2"
                      : "flex min-w-0 flex-1 flex-col justify-between gap-3"
                  }
                >
                  <div className="min-w-0">
                    <Link
                      href={`/products/${product.id}`}
                      className={`line-clamp-2 font-semibold leading-snug text-[var(--store-brand)] transition hover:text-[var(--store-brand-hover)] ${
                        layout === "scroll"
                          ? "text-[10px] uppercase tracking-[0.08em]"
                          : "text-[14px]"
                      }`}
                    >
                      {product.name}
                    </Link>
                    <p
                      className={`mt-1 font-medium tabular-nums text-stone-900 ${
                        layout === "scroll" ? "text-[11px]" : "text-[13px]"
                      }`}
                    >
                      {formatCop(product.priceCents)}
                    </p>
                  </div>

                  {hasVariants ? (
                    <label className="block max-w-[14rem]">
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-500">
                        Fragancia / tono
                      </span>
                      <select
                        value={selectedVariant[product.id] ?? product.variantOptions[0]}
                        onChange={(e) =>
                          setSelectedVariant((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        className="w-full border border-stone-200 bg-white px-2 py-2 text-[12px] text-stone-800 focus:border-[var(--store-accent)] focus:outline-none"
                      >
                        {product.variantOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleQuickAdd(product)}
                    className={`inline-flex items-center justify-center bg-[var(--store-accent)] text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:cursor-wait disabled:opacity-60 ${
                      layout === "scroll"
                        ? "mt-2 w-full px-2 py-2"
                        : "w-full max-w-[14rem] px-4 py-2.5"
                    }`}
                  >
                    {busy ? "Agregando…" : "Agregar al carrito"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
