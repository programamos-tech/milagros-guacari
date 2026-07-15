import Link from "next/link";
import { StoreKitCard } from "@/components/store/StoreKitCard";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";
import { getStorefrontCartQuantityByKitId } from "@/lib/storefront-cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeShellClass } from "@/lib/store-theme";

export const dynamic = "force-dynamic";

export default async function KitsPage() {
  const supabase = await createSupabaseServerClient();
  const allKits = await fetchKitsWithItems(supabase, { publishedOnly: true });
  const kits = allKits
    .filter((k) => kitIsAvailable(k, "storefront"))
    .map((k) => {
      const items = k.items ?? [];
      return {
        id: k.id,
        name: k.name,
        description: k.description ?? "",
        image_path: k.image_path,
        price_cents: resolveKitSalePriceCents(k, items, "storefront"),
        max_stock: maxKitsAvailableFromItems(items, "storefront"),
        item_count: items.length,
      };
    });

  const cartQtyByKitId = await getStorefrontCartQuantityByKitId();

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-white">
      <div className={`${storeShellClass} pb-16 pt-10 lg:pt-12`}>
        <nav
          aria-label="Migas de pan"
          className="mb-6 text-[11px] uppercase tracking-[0.12em] text-stone-400"
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
            <li className="text-stone-600">Kits y combos</li>
          </ol>
        </nav>

        <header className="max-w-2xl">
          <h1 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)] sm:text-[15px] sm:tracking-[0.26em]">
            Kits y combos
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Arma tu pedido con combos a precio especial. Solo mostramos kits que
            podemos armar con el stock actual.
          </p>
        </header>

        {kits.length === 0 ? (
          <p className="mt-12 text-sm text-stone-500">
            Por ahora no hay kits disponibles. Vuelve pronto o explora el{" "}
            <Link href="/products" className="font-medium text-[var(--store-accent)]">
              catálogo
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-12 grid grid-cols-2 items-stretch gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
            {kits.map((kit) => (
              <li key={kit.id} className="h-full">
                <StoreKitCard
                  kit={kit}
                  cartQty={cartQtyByKitId[kit.id] ?? 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
