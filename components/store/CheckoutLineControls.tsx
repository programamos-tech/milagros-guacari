"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLineQuantity } from "@/app/actions/cart";

type Props = {
  productId: string;
  quantity: number;
  maxStock: number;
  fragrance?: string | null;
};

export function CheckoutLineControls({
  productId,
  quantity,
  maxStock,
  fragrance,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-5 space-y-3">
      <p className="text-[13px] text-stone-600">
        <span className="font-medium text-stone-800">Cant.:</span>{" "}
        <span className="tabular-nums">{quantity}</span>
      </p>
      <div className="inline-flex items-center gap-1 border border-[var(--store-accent)]/20 bg-white">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void setLineQuantity(
                productId,
                quantity - 1,
                fragrance ?? undefined,
              ).then(() => router.refresh());
            })
          }
          className="flex size-8 items-center justify-center text-stone-600 transition hover:bg-stone-100 disabled:opacity-40"
          aria-label={quantity <= 1 ? "Quitar producto del pedido" : "Menos uno"}
        >
          <Minus className="size-3.5" strokeWidth={1.35} aria-hidden />
        </button>
        <span className="min-w-[1.75rem] text-center text-xs font-semibold tabular-nums text-stone-900">
          {quantity}
        </span>
        <button
          type="button"
          disabled={pending || quantity >= maxStock}
          onClick={() =>
            startTransition(() => {
              void setLineQuantity(
                productId,
                quantity + 1,
                fragrance ?? undefined,
              ).then(() => router.refresh());
            })
          }
          className="flex size-8 items-center justify-center text-stone-600 transition hover:bg-stone-100 disabled:opacity-40"
          aria-label="Más uno"
        >
          <Plus className="size-3.5" strokeWidth={1.35} aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
        <Link
          href={`/products/${productId}`}
          className="text-stone-700 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-950"
        >
          Editar
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void setLineQuantity(
                productId,
                0,
                fragrance ?? undefined,
              ).then(() => router.refresh());
            })
          }
          className="text-stone-700 underline decoration-stone-400 underline-offset-4 transition hover:text-red-700 disabled:opacity-40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
