"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { addKitToCartFromForm, setKitLineQuantity } from "@/app/actions/cart";
import { useStoreCartDrawer } from "@/components/store/StoreCartDrawerProvider";
import { formatCop } from "@/lib/money";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

export type StoreKitCardKit = {
  id: string;
  name: string;
  description: string;
  image_path: string | null;
  price_cents: number;
  max_stock: number;
  item_count: number;
};

export function StoreKitCard({
  kit,
  cartQty = 0,
}: {
  kit: StoreKitCardKit;
  cartQty?: number;
}) {
  const router = useRouter();
  const { openCart } = useStoreCartDrawer();
  const [pending, startTransition] = useTransition();
  const img = storagePublicObjectUrl(kit.image_path);
  const outOfStock = kit.max_stock < 1;
  const inCart = cartQty > 0;

  return (
    <article className="flex flex-col">
      <div className="relative aspect-[4/5] bg-[#f0eeeb]">
        {img ? (
          <Image
            src={img}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
            unoptimized={shouldUnoptimizeStorageImageUrl(img)}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-stone-300">
            ◆
          </div>
        )}
        <span className="absolute left-2 top-2 bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
          Kit
        </span>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <h2 className="text-[13px] font-semibold uppercase leading-snug tracking-wide text-[var(--store-brand)]">
          {kit.name}
        </h2>
        {kit.description.trim() ? (
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-stone-600">
            {kit.description}
          </p>
        ) : null}
        <p className="mt-2 text-[12px] text-stone-500">
          {kit.item_count} producto{kit.item_count === 1 ? "" : "s"} incluido
        </p>
        <p className="mt-3 text-[15px] font-medium tabular-nums text-stone-900">
          {formatCop(kit.price_cents)}
        </p>
        {outOfStock ? (
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Agotado
          </p>
        ) : inCart ? (
          <div className="mt-4 inline-flex items-center border border-[var(--store-accent)]/25 bg-white">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setKitLineQuantity(kit.id, cartQty - 1).then(() => {
                    router.refresh();
                    openCart();
                  });
                })
              }
              className="flex size-9 items-center justify-center text-stone-700 transition hover:bg-stone-100 disabled:opacity-40"
              aria-label={cartQty <= 1 ? "Quitar de la bolsa" : "Menos uno"}
            >
              <Minus className="size-3.5" strokeWidth={1.35} aria-hidden />
            </button>
            <span className="min-w-[2rem] text-center text-xs font-semibold tabular-nums">
              {cartQty}
            </span>
            <button
              type="button"
              disabled={pending || cartQty >= kit.max_stock}
              onClick={() =>
                startTransition(() => {
                  void setKitLineQuantity(kit.id, cartQty + 1).then(() => {
                    router.refresh();
                    openCart();
                  });
                })
              }
              className="flex size-9 items-center justify-center text-stone-700 transition hover:bg-stone-100 disabled:opacity-40"
              aria-label="Más uno"
            >
              <Plus className="size-3.5" strokeWidth={1.35} aria-hidden />
            </button>
          </div>
        ) : (
          <form
            action={addKitToCartFromForm}
            className="mt-4"
            onSubmit={() => {
              startTransition(() => {
                router.refresh();
                openCart();
              });
            }}
          >
            <input type="hidden" name="kitId" value={kit.id} />
            <input type="hidden" name="quantity" value="1" />
            <button
              type="submit"
              disabled={pending}
              className="w-full border border-[var(--store-accent)] bg-[var(--store-accent)] py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--store-accent-hover)] disabled:opacity-50"
            >
              Agregar kit
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
