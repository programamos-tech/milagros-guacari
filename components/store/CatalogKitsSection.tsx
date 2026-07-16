import Link from "next/link";
import { StoreKitCard, type StoreKitCardKit } from "@/components/store/StoreKitCard";
import { RevealOnScroll } from "@/components/store/RevealOnScroll";

type Props = {
  kits: StoreKitCardKit[];
  cartQtyByKitId: Record<string, number>;
};

/** Sección «Kits y combos» al inicio del catálogo. */
export function CatalogKitsSection({ kits, cartQtyByKitId }: Props) {
  if (kits.length === 0) return null;

  return (
    <section
      aria-labelledby="cat-row-kits"
      className="w-full min-w-0 max-w-full"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-0 sm:mb-5">
        <h2
          id="cat-row-kits"
          className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]"
        >
          Kits y combos
        </h2>
        <Link
          href="/kits"
          className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      <ul className="grid grid-cols-2 items-stretch gap-x-5 gap-y-12 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10 xl:grid-cols-4">
        {kits.map((kit, index) => (
          <li key={kit.id} className="h-full">
            <RevealOnScroll
              className="h-full"
              delayMs={Math.min(index * 48, 280)}
            >
              <StoreKitCard
                kit={kit}
                cartQty={cartQtyByKitId[kit.id] ?? 0}
              />
            </RevealOnScroll>
          </li>
        ))}
      </ul>
    </section>
  );
}
