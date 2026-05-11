import Link from "next/link";
import { CalendarDays, Headset, Star } from "lucide-react";
import { ProductListingCard } from "@/components/store/ProductListingCard";
import { RevealOnScroll } from "@/components/store/RevealOnScroll";
import { storeBrand } from "@/lib/brand";
import { StoreBannerCarousel } from "@/components/store/StoreBannerCarousel";
import { fetchPublishedBanners } from "@/lib/store-banners";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchStorefrontCouponDiscountPercentByProductId } from "@/lib/store-coupons";

export const dynamic = "force-dynamic";

const HOME_PRODUCTS_LIMIT = 8;
const STORE_HIGHLIGHTS = [
  {
    title: "Productos 100% originales de la más alta calidad",
    Icon: Star,
  },
  {
    title: "Envíamos dentro de las 24 horas posteriores a tu compra",
    Icon: CalendarDays,
  },
  {
    title: "Te asesoramos diariamente por WhatsApp",
    Icon: Headset,
  },
] as const;

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const heroBanners = await fetchPublishedBanners(supabase, "hero");
  const { data: homeProducts } = await supabase
    .from("products")
    .select(
      "id,name,brand,description,price_cents,image_path,stock_quantity,fragrance_options,created_at",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(HOME_PRODUCTS_LIMIT);

  const featuredProducts = homeProducts ?? [];
  const couponPctByProductId =
    await fetchStorefrontCouponDiscountPercentByProductId(supabase);

  return (
    <div>
      {/* Hero: solo imágenes desde Admin → Banners (zona hero), ancho completo, sin textos */}
      <section className="w-full" aria-label="Banner principal">
        {heroBanners.length > 0 ? (
          <StoreBannerCarousel
            variant="hero"
            slides={heroBanners.map((b) => ({
              id: b.id,
              image_path: b.image_path,
              href: b.href,
              alt_text: b.alt_text,
            }))}
          />
        ) : (
          <div className="flex min-h-[min(40vh,320px)] w-full flex-col items-center justify-center gap-3 bg-stone-100 px-4 py-16 text-center">
            <p className="max-w-md text-sm text-stone-500">
              Aún no hay banner principal. Sube imágenes en el panel:{" "}
              <Link
                href="/admin/banners"
                className="font-semibold text-[#6b7f6a] underline decoration-[#6b7f6a]/35 underline-offset-2 hover:text-[#556654]"
              >
                Administración → Banners
              </Link>{" "}
              (zona <span className="font-medium text-stone-600">hero</span>).
            </p>
          </div>
        )}
      </section>

      {/* Highlights */}
      <section className="border-t border-stone-200/60 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <ul className="grid gap-8 border-y border-stone-200/70 py-8 sm:py-10 md:grid-cols-3 md:gap-6">
            {STORE_HIGHLIGHTS.map(({ title, Icon }, i) => (
              <li key={title}>
                <RevealOnScroll
                  delayMs={Math.min(i * 100, 240)}
                  className="flex flex-col items-center text-center"
                >
                  <span className="inline-flex size-8 items-center justify-center text-zinc-900">
                    <Icon className="size-5" strokeWidth={2.2} />
                  </span>
                  <p className="mt-3 max-w-[19rem] text-sm leading-tight text-stone-800 sm:text-[15px]">
                    {title}
                  </p>
                </RevealOnScroll>
              </li>
            ))}
          </ul>

          <div className="mt-16 pt-14 sm:mt-20 sm:pt-16">
            <RevealOnScroll className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400 sm:text-xs">
                Destacado en {storeBrand.split(/\s+/)[0]}
              </p>
              <h2 className="mt-2 text-2xl font-semibold uppercase tracking-[0.06em] text-stone-900 sm:text-3xl">
                Productos destacados
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm font-normal leading-relaxed text-stone-500">
                Versatilidad y estilo; abrí cada producto para ver detalle y
                comprar.
              </p>
            </RevealOnScroll>

            {featuredProducts.length === 0 ? (
              <p className="mt-10 rounded-xl border border-dashed border-stone-200/90 bg-[#faf8f5]/60 p-10 text-center text-sm text-stone-600">
                Aún no hay productos publicados. Cárgalos desde el admin para que
                aparezcan aquí.
              </p>
            ) : (
              <>
                <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-10">
                  {featuredProducts.map((p, index) => (
                    <li key={p.id}>
                      <RevealOnScroll
                        className="h-full"
                        delayMs={Math.min(index * 70, 420)}
                      >
                        <ProductListingCard
                          presentation="editorial"
                          accentImageBg={index % 4 === 3}
                          couponDiscountPercent={
                            couponPctByProductId[p.id] ?? 0
                          }
                          product={{
                            id: p.id,
                            name: p.name,
                            brand: p.brand,
                            description: p.description,
                            price_cents: p.price_cents,
                            image_path: p.image_path,
                            stock_quantity: p.stock_quantity,
                            fragrance_options: p.fragrance_options,
                          }}
                        />
                      </RevealOnScroll>
                    </li>
                  ))}
                </ul>
                <RevealOnScroll
                  delayMs={160}
                  className="mt-12 flex justify-center sm:mt-14"
                >
                  <Link
                    href="/products"
                    className="inline-flex border border-stone-900 bg-white px-10 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-900 transition hover:bg-stone-900 hover:text-white"
                  >
                    Ver catálogo completo
                  </Link>
                </RevealOnScroll>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
