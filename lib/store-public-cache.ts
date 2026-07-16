import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { fetchCatalogBrowseSections } from "@/lib/catalog-browse-rows";
import { fetchStoreCategoriesWithCounts } from "@/lib/fetch-store-categories";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import { fetchListingFacets } from "@/lib/product-listing-facets";
import {
  kitIsAvailable,
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";
import { fetchPublishedBanners } from "@/lib/store-banners";
import { fetchBannerStoreCoupon, fetchStorefrontCouponDiscountPercentByProductId } from "@/lib/store-coupons";
import { fetchActiveWelcomeModal } from "@/lib/store-welcome-modal";
import { withStorefrontImage } from "@/lib/storefront-product-image";

const STORE_CACHE_REVALIDATE_SEC = 300;

function publicSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}

export const getCachedStoreCategoriesWithCounts = unstable_cache(
  async () => fetchStoreCategoriesWithCounts(publicSupabase()),
  ["store-categories-with-counts"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-categories"] },
);

export const getCachedAllCategoryRows = unstable_cache(
  async () => {
    const { data } = await publicSupabase()
      .from("categories")
      .select("id,name,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    return data ?? [];
  },
  ["store-all-category-rows"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-categories"] },
);

export async function getCachedListingFacets(
  categoryIds: string[] | null,
): Promise<Awaited<ReturnType<typeof fetchListingFacets>>> {
  const key =
    categoryIds?.length ?
      `store-listing-facets:${[...categoryIds].sort().join(",")}`
    : "store-listing-facets:all";
  return unstable_cache(
    async () => fetchListingFacets(publicSupabase(), { categoryIds }),
    [key],
    { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-products"] },
  )();
}

export async function getCachedCatalogBrowseSections(
  allCategoryRows: { id: string; name: string; sort_order: number }[],
) {
  const key = `store-catalog-sections:${allCategoryRows.map((c) => c.id).join(",")}`;
  return unstable_cache(
    async () => fetchCatalogBrowseSections(publicSupabase(), allCategoryRows),
    [key],
    { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-products"] },
  )();
}

export const getCachedPublishedBanners = async (
  placement: "hero" | "products",
) =>
  unstable_cache(
    async () => fetchPublishedBanners(publicSupabase(), placement),
    [`store-published-banners:${placement}`],
    { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-banners"] },
  )();

export const getCachedBannerStoreCoupon = unstable_cache(
  async () => fetchBannerStoreCoupon(publicSupabase()),
  ["store-banner-coupon"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-coupons"] },
);

export const getCachedActiveWelcomeModal = unstable_cache(
  async () => fetchActiveWelcomeModal(publicSupabase()),
  ["store-welcome-modal"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-welcome-modal"] },
);

export const getCachedStorefrontCouponDiscounts = unstable_cache(
  async () => fetchStorefrontCouponDiscountPercentByProductId(publicSupabase()),
  ["storefront-coupon-discounts"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-coupons"] },
);

const HOME_PRODUCTS_LIMIT = 8;

export type HomeFeaturedProduct = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price_cents: number;
  has_vat: boolean | null;
  image_path: string | null;
  stock_quantity: number;
  fragrance_options: string[] | null;
  created_at: string;
};

export const getCachedHomeFeaturedProducts = unstable_cache(
  async (): Promise<HomeFeaturedProduct[]> => {
    const { data } = await withStorefrontImage(
      publicSupabase()
        .from("products")
        .select(
          "id,name,brand,description,price_cents,has_vat,image_path,stock_quantity,fragrance_options,created_at",
        )
        .eq("is_published", true),
    )
      .order("created_at", { ascending: false })
      .limit(HOME_PRODUCTS_LIMIT);
    return (data ?? []) as HomeFeaturedProduct[];
  },
  ["store-home-featured-products"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-products"] },
);

const HOME_KITS_LIMIT = 8;

export type HomeFeaturedKit = {
  id: string;
  name: string;
  description: string;
  image_path: string | null;
  price_cents: number;
  max_stock: number;
  item_count: number;
};

async function loadAvailableStorefrontKits(): Promise<HomeFeaturedKit[]> {
  const kits = await fetchKitsWithItems(publicSupabase(), {
    publishedOnly: true,
  });
  return kits
    .filter((k) => kitIsAvailable(k, "storefront"))
    .map((k) => {
      const items = k.items ?? [];
      return {
        id: k.id as string,
        name: k.name,
        description: k.description ?? "",
        image_path: k.image_path,
        price_cents: resolveKitSalePriceCents(k, items, "storefront"),
        max_stock: maxKitsAvailableFromItems(items, "storefront"),
        item_count: items.length,
      };
    });
}

export const getCachedHomeFeaturedKits = unstable_cache(
  async (): Promise<HomeFeaturedKit[]> => {
    const kits = await loadAvailableStorefrontKits();
    return kits.slice(0, HOME_KITS_LIMIT);
  },
  ["store-home-featured-kits"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-kits"] },
);

/** Todos los kits disponibles para la sección del catálogo. */
export const getCachedCatalogKits = unstable_cache(
  async (): Promise<HomeFeaturedKit[]> => loadAvailableStorefrontKits(),
  ["store-catalog-kits"],
  { revalidate: STORE_CACHE_REVALIDATE_SEC, tags: ["store-kits"] },
);
