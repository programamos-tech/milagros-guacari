"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import {
  STORE_HEADER_ICON_LG,
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";
import { useStoreFavorites } from "@/components/store/StoreFavoritesProvider";

export function StoreFavoritesNavLink() {
  const { count, ready } = useStoreFavorites();
  const filled = ready && count > 0;

  return (
    <Link
      href="/favoritos"
      aria-label={
        count > 0 ? `Favoritos, ${count} producto${count === 1 ? "" : "s"}` : "Favoritos"
      }
      className="flex items-center justify-center rounded-none p-1.5 text-stone-600 transition hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/35 focus-visible:ring-offset-2"
    >
      <Heart
        className={STORE_HEADER_ICON_LG}
        strokeWidth={STORE_HEADER_ICON_STROKE}
        fill={filled ? "currentColor" : "none"}
      />
      {ready && count > 0 ? (
        <span className="sr-only">{count} guardados</span>
      ) : null}
    </Link>
  );
}
