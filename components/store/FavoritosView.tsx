"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProductListingCard } from "@/components/store/ProductListingCard";
import { RevealOnScroll } from "@/components/store/RevealOnScroll";
import { useStoreFavorites } from "@/components/store/StoreFavoritesProvider";
import { storeBrand } from "@/lib/brand";

const shellClass = "mx-auto max-w-7xl px-4 py-10 sm:py-12";

const primaryCtaClass =
  "inline-flex items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-[var(--store-accent-hover)]";

function FavoritosPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 max-w-2xl sm:mb-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em] text-[var(--store-brand)] sm:text-2xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
    </header>
  );
}

type Product = {
  id: string;
  name: string;
  brand?: string | null;
  description: string | null;
  price_cents: number;
  image_path: string | null;
  stock_quantity: number;
  size_value?: number | null;
  size_unit?: string | null;
  fragrance_options?: string[] | null;
  coupon_discount_percent?: number;
};

export function FavoritosView() {
  const { ids, ready } = useStoreFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartQtyByProductId, setCartQtyByProductId] = useState<
    Record<string, number>
  >({});

  const reloadCartQuantities = useCallback(() => {
    void fetch("/api/store/cart")
      .then((r) => r.json())
      .then(
        (body: {
          lines?: { productId: string; quantity: number }[];
        }) => {
          const next: Record<string, number> = {};
          for (const l of body.lines ?? []) {
            next[l.productId] = (next[l.productId] ?? 0) + l.quantity;
          }
          setCartQtyByProductId(next);
        },
      )
      .catch(() => setCartQtyByProductId({}));
  }, []);

  useEffect(() => {
    reloadCartQuantities();
  }, [reloadCartQuantities, ready, ids]);

  useEffect(() => {
    if (!ready) return;
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    const q = encodeURIComponent(ids.join(","));
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/favorites?ids=${q}`)
      .then((r) => r.json())
      .then((body: { products?: Product[] }) => {
        if (!cancelled) setProducts(body.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, ids]);

  if (!ready) {
    return (
      <div className={shellClass}>
        <FavoritosPageHeader
          eyebrow="Catálogo"
          title="Favoritos"
          description="Estamos cargando tu lista guardada en este dispositivo."
        />
        <div className="rounded-xl border border-stone-200/90 bg-white px-4 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-stone-500">Cargando favoritos…</p>
        </div>
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className={shellClass}>
        <FavoritosPageHeader
          eyebrow="Catálogo"
          title="Favoritos"
          description="Guarda piezas mientras navegas el catálogo; quedan en esta lista en tu navegador."
        />
        <div className="mx-auto max-w-lg">
          <div className="flex flex-col items-center rounded-xl border border-stone-200/90 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-10 sm:py-14">
            <div
              className="flex size-14 items-center justify-center rounded-full border border-stone-200/90 bg-[var(--store-chrome-bg)]"
              aria-hidden
            >
              <Heart className="size-7 text-stone-800" strokeWidth={1.25} />
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-stone-600">
              Todavía no tienes productos guardados. En cada tarjeta del catálogo toca el corazón y
              los verás aquí.
            </p>
            <Link href="/products" className={`${primaryCtaClass} mt-8 w-full max-w-xs sm:w-auto`}>
              Ir al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <FavoritosPageHeader
        eyebrow="Catálogo"
        title="Favoritos"
        description={`Piezas que marcaste en ${storeBrand}. Puedes quitarlas tocando de nuevo el corazón en la tarjeta.`}
      />

      {loading ? (
        <div className="rounded-xl border border-stone-200/90 bg-white px-4 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-stone-500">Cargando productos…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-[var(--store-chrome-bg)] px-4 py-10 text-center text-sm text-stone-600 sm:px-8">
          No encontramos estos productos o ya no están publicados.{" "}
          <Link
            href="/products"
            className="font-medium text-[var(--store-accent)] underline underline-offset-4 hover:text-[var(--store-accent-hover)]"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10 xl:grid-cols-4">
          {products.map((p, index) => (
            <li key={p.id}>
              <RevealOnScroll
                className="h-full"
                delayMs={Math.min(index * 65, 400)}
              >
                <ProductListingCard
                  accentImageBg={index % 4 === 3}
                  cartQuantity={cartQtyByProductId[p.id] ?? 0}
                  couponDiscountPercent={p.coupon_discount_percent ?? 0}
                  product={p}
                  onCartChange={reloadCartQuantities}
                />
              </RevealOnScroll>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
