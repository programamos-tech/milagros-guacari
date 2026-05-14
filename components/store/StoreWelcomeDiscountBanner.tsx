"use client";

import { X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import {
  storeWelcomeDiscountCode,
  storeWelcomeDiscountMessage,
} from "@/lib/brand";
import { STORE_HEADER_ICON_STROKE } from "@/lib/store-header-icons";
import type { StoreCouponBannerPayload } from "@/lib/store-coupons";

const PROMO_DISMISS_EVENT = "tiendas-promo-dismiss";

function dismissStorageKey(dbCoupon: StoreCouponBannerPayload | null) {
  return dbCoupon
    ? `tiendas_store_promo_dismissed_${dbCoupon.id}`
    : "tiendas_store_promo_dismissed_env";
}

export function StoreWelcomeDiscountBanner({
  dbCoupon,
}: {
  dbCoupon: StoreCouponBannerPayload | null;
}) {
  const message = dbCoupon?.banner_message ?? storeWelcomeDiscountMessage;
  const code = dbCoupon?.code ?? storeWelcomeDiscountCode;
  const dismissKey = dismissStorageKey(dbCoupon);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      const kick = () => onStoreChange();
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === dismissKey) {
          kick();
        }
      };
      window.addEventListener(PROMO_DISMISS_EVENT, kick);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(PROMO_DISMISS_EVENT, kick);
        window.removeEventListener("storage", onStorage);
      };
    },
    [dismissKey],
  );

  const getSnapshot = useCallback(() => {
    return window.sessionStorage.getItem(dismissKey) === "1";
  }, [dismissKey]);

  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const visible = !dismissed;

  const close = () => {
    window.sessionStorage.setItem(dismissKey, "1");
    window.dispatchEvent(new Event(PROMO_DISMISS_EVENT));
  };

  if (!visible) return null;

  return (
    <div className="border-b border-[#ffd6e8]/80 bg-[#fff8fb]">
      <div className="relative mx-auto max-w-5xl px-4 py-2.5 pr-11 sm:pr-12">
        <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[11px] font-medium uppercase leading-snug tracking-[0.14em] text-stone-700 sm:text-xs sm:tracking-[0.16em]">
          <span className="max-w-[min(100%,38rem)]">{message}</span>
          <span className="inline-flex shrink-0 items-center rounded border border-[#FF76A1]/35 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-[var(--store-accent)] tabular-nums">
            {code}
          </span>
        </p>
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-none text-stone-600 transition hover:text-[var(--store-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]/30 focus-visible:ring-offset-2 sm:right-4"
          aria-label="Cerrar banner de descuento"
        >
          <X className="size-4" strokeWidth={STORE_HEADER_ICON_STROKE} aria-hidden />
        </button>
      </div>
    </div>
  );
}
