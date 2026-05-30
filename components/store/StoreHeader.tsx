import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  STORE_HEADER_ICON_LG,
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStorefrontCartItemCount } from "@/lib/storefront-cart";
import { storeBrand, storeLogoPath } from "@/lib/brand";
import { StoreAnnouncementBar } from "@/components/store/StoreAnnouncementBar";
import { StoreHeaderActions } from "@/components/store/StoreHeaderActions";
import { StoreNavDropdowns } from "@/components/store/StoreNavDropdowns";
import { StoreSearch } from "@/components/store/StoreSearch";
import { getCachedStoreCategoriesWithCounts } from "@/lib/store-public-cache";

function accountFirstNameFromUser(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof meta?.name === "string"
        ? meta.name
        : null;
  const part = full?.trim().split(/\s+/).filter(Boolean)[0];
  if (part) return part.length > 18 ? `${part.slice(0, 18)}…` : part;
  const local = user.email?.split("@")[0];
  if (local) return local.length > 18 ? `${local.slice(0, 18)}…` : local;
  return null;
}

export async function StoreHeader() {
  const supabase = await createSupabaseServerClient();
  const [menuCategories, cartItemCount, { data: { user } }] = await Promise.all([
    getCachedStoreCategoriesWithCounts(),
    getStorefrontCartItemCount(),
    supabase.auth.getUser(),
  ]);
  const userIconHref = user ? "/cuenta" : "/cuenta/entrar";
  const userIconLabel = user ? "Mi cuenta" : "Iniciar sesión";
  const accountFirstName = accountFirstNameFromUser(user);

  return (
    <header>
      <StoreAnnouncementBar />

      <div className="border-b border-white/20 bg-[var(--store-header-bg)] text-[var(--store-header-fg)]">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-x-2 px-3 py-3 sm:gap-x-3 sm:px-4 md:py-3.5 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-6 lg:px-10 lg:py-5">
          <div className="flex min-w-0 items-center justify-start lg:pr-4">
            <StoreNavDropdowns
              menuCategories={menuCategories}
              accountHref={userIconHref}
              accountLabel={userIconLabel}
            />
          </div>

          <div className="flex min-w-0 justify-center px-1 sm:px-2">
            <Link
              href="/"
              className="block w-full max-w-[min(100%,18rem)] outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)] sm:max-w-[min(100%,20rem)] lg:max-w-[22rem] xl:max-w-[24rem]"
            >
              <Image
                src={storeLogoPath}
                alt={storeBrand}
                width={420}
                height={230}
                className="mx-auto h-11 w-full object-contain object-center sm:h-12 lg:h-[4.25rem]"
                priority
              />
            </Link>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1 md:gap-2 lg:justify-end lg:gap-4 lg:pl-4">
            <Link
              href="/products"
              className="hidden shrink-0 items-center justify-center p-1.5 text-white/90 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)] md:flex lg:hidden"
              aria-label="Buscar productos"
            >
              <Search
                className={STORE_HEADER_ICON_LG}
                strokeWidth={STORE_HEADER_ICON_STROKE}
                aria-hidden
              />
            </Link>
            <StoreSearch variant="minimal" />
            <StoreHeaderActions
              isLoggedIn={!!user}
              cartItemCount={cartItemCount}
              userIconHref={userIconHref}
              userIconLabel={userIconLabel}
              accountFirstName={accountFirstName}
              guestOpensAuthDrawer={!user}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
