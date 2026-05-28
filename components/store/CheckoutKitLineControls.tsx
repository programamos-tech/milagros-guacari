"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setKitLineQuantity } from "@/app/actions/cart";

type Props = {
  kitId: string;
  quantity: number;
  maxStock: number;
};

export function CheckoutKitLineControls({ kitId, quantity, maxStock }: Props) {
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
              void setKitLineQuantity(kitId, quantity - 1).then(() =>
                router.refresh(),
              );
            })
          }
          className="flex size-8 items-center justify-center text-stone-600 transition hover:bg-stone-100 disabled:opacity-40"
          aria-label={quantity <= 1 ? "Quitar kit del pedido" : "Menos uno"}
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
              void setKitLineQuantity(kitId, quantity + 1).then(() =>
                router.refresh(),
              );
            })
          }
          className="flex size-8 items-center justify-center text-stone-600 transition hover:bg-stone-100 disabled:opacity-40"
          aria-label="Más uno"
        >
          <Plus className="size-3.5" strokeWidth={1.35} aria-hidden />
        </button>
      </div>
      <Link
        href="/kits"
        className="text-[12px] font-medium text-[var(--store-accent)] underline-offset-2 hover:underline"
      >
        Ver kits
      </Link>
    </div>
  );
}
