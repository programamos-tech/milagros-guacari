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
import { fetchStoreCategoriesWithCounts } from "@/lib/fetch-store-categories";

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
  const menuCategories = await fetchStoreCategoriesWithCounts(supabase);
  const cartItemCount = await getStorefrontCartItemCount();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userIconHref = user ? "/cuenta" : "/cuenta/entrar";
  const userIconLabel = user ? "Mi cuenta" : "Iniciar sesión";
  const accountFirstName = accountFirstNameFromUser(user);

  return (
    <header>
      <StoreAnnouncementBar />

      <div className="relative flex items-center justify-between gap-3 border-b border-white/20 bg-[var(--store-header-bg)] px-4 py-4 text-[var(--store-header-fg)] lg:gap-6 lg:px-10 lg:py-5">
        <div className="z-10 flex min-w-0 flex-1 items-center justify-start">
          <StoreNavDropdowns menuCategories={menuCategories} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center px-16 sm:px-44 md:px-48 lg:px-[13.5rem]">
          <Link
            href="/"
            className="pointer-events-auto shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)]"
          >
            <Image
              src={storeLogoPath}
              alt={storeBrand}
              width={420}
              height={230}
              className="h-12 w-auto max-w-[min(62vw,340px)] object-contain object-center sm:h-[3.5rem] md:h-16 lg:h-[4.5rem] lg:max-w-[min(42vw,400px)]"
              priority
            />
          </Link>
        </div>

        <div className="z-10 flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4 lg:gap-6">
          <Link
            href="/products"
            className="flex shrink-0 items-center justify-center p-1.5 text-white/90 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)] sm:hidden"
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
    </header>
  );
}
