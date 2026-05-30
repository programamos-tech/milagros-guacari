import type { CSSProperties } from "react";
import { Suspense } from "react";
import { StoreAuthModalProvider } from "@/components/store/StoreAuthModals";
import { StoreCookiesBanner } from "@/components/store/StoreCookiesBanner";
import { StoreFavoritesProvider } from "@/components/store/StoreFavoritesProvider";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreHeaderSkeleton } from "@/components/store/StoreHeaderSkeleton";
import { StoreWelcomeSignupModal } from "@/components/store/StoreWelcomeSignupModal";
import { StoreWelcomeDiscountBanner } from "@/components/store/StoreWelcomeDiscountBanner";
import { StoreWhatsAppFloatingButton } from "@/components/store/StoreWhatsAppFloatingButton";
import { StoreCartDrawerProvider } from "@/components/store/StoreCartDrawerProvider";
import { resolveWelcomeModalCtaHref } from "@/lib/store-welcome-modal";
import { STORE_HEADER_BG, STORE_HEADER_FG } from "@/lib/store-theme";
import {
  getCachedBannerStoreCoupon,
  getCachedActiveWelcomeModal,
} from "@/lib/store-public-cache";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [welcomeModal, promoBanner] = await Promise.all([
    getCachedActiveWelcomeModal(),
    getCachedBannerStoreCoupon(),
  ]);

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
            <Suspense fallback={<StoreHeaderSkeleton />}>
              <StoreHeader />
            </Suspense>
            <StoreWelcomeDiscountBanner dbCoupon={promoBanner} />
            <main className="flex-1">
              <Suspense>{children}</Suspense>
            </main>
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
