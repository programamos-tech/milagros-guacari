"use client";

import Link from "next/link";
import { ShoppingBag, UserRound } from "lucide-react";
import {
  STORE_HEADER_ICON_LG,
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";
import { StoreFavoritesNavLink } from "@/components/store/StoreFavoritesNavLink";
import { useStoreAuthModals } from "@/components/store/StoreAuthModals";
import { useStoreCartDrawer } from "@/components/store/StoreCartDrawerProvider";

const iconBtn =
  "flex items-center justify-center rounded-none p-1.5 text-white/90 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)]";

export function StoreHeaderActions({
  isLoggedIn,
  cartItemCount,
  userIconHref,
  userIconLabel,
  accountFirstName,
  guestOpensAuthDrawer = false,
}: {
  isLoggedIn: boolean;
  cartItemCount: number;
  userIconHref: string;
  userIconLabel: string;
  accountFirstName: string | null;
  guestOpensAuthDrawer?: boolean;
}) {
  const { openCart } = useStoreCartDrawer();
  const { openLogin } = useStoreAuthModals();

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
      {guestOpensAuthDrawer ? (
        <button
          type="button"
          onClick={() => openLogin()}
          aria-label={userIconLabel}
          className={`${iconBtn} gap-2`}
        >
          <UserRound
            className={STORE_HEADER_ICON_LG}
            strokeWidth={STORE_HEADER_ICON_STROKE}
            aria-hidden
          />
        </button>
      ) : (
        <Link
          href={userIconHref}
          aria-label={userIconLabel}
          className={`${iconBtn} gap-2`}
        >
          <UserRound
            className={STORE_HEADER_ICON_LG}
            strokeWidth={STORE_HEADER_ICON_STROKE}
            aria-hidden
          />
          {isLoggedIn && accountFirstName ? (
            <span className="hidden text-[13px] font-normal tracking-wide text-white/85 md:inline">
              Hola, {accountFirstName}
            </span>
          ) : null}
        </Link>
      )}
      <StoreFavoritesNavLink />
      <button
        type="button"
        onClick={() => openCart()}
        aria-label={
          cartItemCount > 0
            ? `Bolsa de compras, ${cartItemCount} productos. Abrir bolsa`
            : "Bolsa de compras. Abrir bolsa"
        }
        aria-haspopup="dialog"
        className={`${iconBtn} gap-1.5`}
      >
        {cartItemCount > 0 ? (
          <span className="min-w-[1ch] text-center text-[13px] font-medium tabular-nums text-white/90">
            {cartItemCount > 99 ? "99+" : cartItemCount}
          </span>
        ) : null}
        <ShoppingBag
          className={STORE_HEADER_ICON_LG}
          strokeWidth={STORE_HEADER_ICON_STROKE}
          aria-hidden
        />
      </button>
    </div>
  );
}
