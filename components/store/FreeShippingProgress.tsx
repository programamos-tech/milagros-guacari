import { formatCop } from "@/lib/money";
import { freeShippingProgress, storeFreeShippingMinCents } from "@/lib/store-free-shipping";

export function FreeShippingProgress({
  subtotalCents,
  className = "",
}: {
  subtotalCents: number;
  className?: string;
}) {
  if (storeFreeShippingMinCents <= 0) return null;

  const { remainingCents, progressPct, qualified } =
    freeShippingProgress(subtotalCents);

  return (
    <div
      className={`rounded-lg border border-orange-200/80 bg-orange-50/70 px-4 py-3.5 ${className}`.trim()}
      role="status"
    >
      {qualified ? (
        <p className="text-[13px] font-medium leading-snug text-orange-900">
          ¡Tu pedido califica para{" "}
          <span className="font-semibold">envío gratuito</span>!
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-snug text-stone-700">
            Agrega{" "}
            <span className="font-semibold text-stone-900">
              {formatCop(remainingCents)}
            </span>{" "}
            en productos para tener envío gratuito
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-orange-200/70"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-orange-500 transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
