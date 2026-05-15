import type { CSSProperties } from "react";
import { StoreAuthModalProvider } from "@/components/store/StoreAuthModals";
import { StoreCookiesBanner } from "@/components/store/StoreCookiesBanner";
import { StoreFavoritesProvider } from "@/components/store/StoreFavoritesProvider";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreWelcomeSignupModal } from "@/components/store/StoreWelcomeSignupModal";
import { StoreWelcomeDiscountBanner } from "@/components/store/StoreWelcomeDiscountBanner";
import { StoreWhatsAppFloatingButton } from "@/components/store/StoreWhatsAppFloatingButton";
import { StoreCartDrawerProvider } from "@/components/store/StoreCartDrawerProvider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STORE_HEADER_BG, STORE_HEADER_FG } from "@/lib/store-theme";
import { fetchBannerStoreCoupon } from "@/lib/store-coupons";
import {
  fetchActiveWelcomeModal,
  resolveWelcomeModalCtaHref,
} from "@/lib/store-welcome-modal";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const welcomeModal = await fetchActiveWelcomeModal(supabase);
  const promoBanner = await fetchBannerStoreCoupon(supabase);

  return (
    <StoreFavoritesProvider>
      <StoreCartDrawerProvider>
        <StoreAuthModalProvider>
          <div
            className="flex min-h-full flex-col overflow-x-hidden bg-white text-stone-800"
            style={
              {
                "--store-header-bg": STORE_HEADER_BG,
                "--store-header-fg": STORE_HEADER_FG,
              } as CSSProperties
            }
          >
            <StoreHeader />
            <StoreWelcomeDiscountBanner dbCoupon={promoBanner} />
            <main className="flex-1">{children}</main>
            <StoreFooter />
            <StoreWhatsAppFloatingButton />
            <StoreCookiesBanner />
            {welcomeModal ? (
              <StoreWelcomeSignupModal
                title={welcomeModal.title}
                description={welcomeModal.description}
                imagePath={welcomeModal.image_path}
                discountCode={welcomeModal.discount_code}
                ctaLabel={welcomeModal.cta_label}
                ctaHref={resolveWelcomeModalCtaHref(welcomeModal.cta_href)}
              />
            ) : null}
          </div>
        </StoreAuthModalProvider>
      </StoreCartDrawerProvider>
    </StoreFavoritesProvider>
  );
}
