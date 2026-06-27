import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogBrowseSections } from "@/components/store/CatalogBrowseSections";
import { CatalogListingHero } from "@/components/store/CatalogListingHero";
import { CategoryListingHero } from "@/components/store/CategoryListingHero";
import { StoreBannerCarousel } from "@/components/store/StoreBannerCarousel";
import { ProductListingCard } from "@/components/store/ProductListingCard";
import { ProductsListingControls } from "@/components/store/ProductsListingControls";
import { RevealOnScroll } from "@/components/store/RevealOnScroll";
import {
  mergeCategoryRowsForFilterMenu,
} from "@/lib/product-listing-facets";
import {
  expandCategoryIdsFromRows,
  expandManyCategoryIdsFromRows,
  fetchExpandedCategoryIds,
} from "@/lib/store-category-group";
import {
  parseProductsBrandFilter,
  parseProductsBrandsParam,
  parseProductsCategoriesFilterParam,
  parseProductsCategoryId,
  parseProductsColorsParam,
  parseProductsPriceMaxParam,
  parseProductsPriceMinParam,
  parseProductsSizesParam,
} from "@/lib/product-list-query";
import { getStorefrontCartQuantityByProductId } from "@/lib/storefront-cart";
import { getCachedStorefrontCouponDiscounts } from "@/lib/store-public-cache";
import { resolveCategoryListingHeroSrc } from "@/lib/category-listing-hero-url";
import {
  getCachedAllCategoryRows,
  getCachedCatalogBrowseSections,
  getCachedListingFacets,
  getCachedPublishedBanners,
} from "@/lib/store-public-cache";
import { storeShellClass } from "@/lib/store-theme";
import { withStorefrontImage } from "@/lib/storefront-product-image";

/** Tope de filas en listado filtrado (evita respuestas enormes). */
const CATALOG_FILTERED_LIST_MAX = 300;

/** Legacy (`size_value`/`size_unit`) o cualquier entrada en `size_options`. */
function productMatchesSizeFilterClause(s: {
  value: number;
  unit: string;
}): string {
  const blob = JSON.stringify([{ value: s.value, unit: s.unit }]);
  return `and(size_value.eq.${s.value},size_unit.eq.${s.unit}),size_options.cs.${blob}`;
}

function firstSearchParam(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    sort?: string | string[];
    category?: string | string[];
    brand?: string | string[];
    brands?: string | string[];
    colors?: string | string[];
    sizes?: string | string[];
    categories?: string | string[];
    price_min?: string | string[];
    price_max?: string | string[];
  }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const qRaw = sp.q;
  const q = typeof qRaw === "string" ? qRaw.trim() : "";
  const sortRaw = sp.sort;
  const sort =
    typeof sortRaw === "string" && sortRaw.trim()
      ? sortRaw.trim()
      : "newest";
  const categoryId = parseProductsCategoryId(firstSearchParam(sp.category));
  const brandsParam = parseProductsBrandsParam(firstSearchParam(sp.brands));
  const legacyBrand = parseProductsBrandFilter(firstSearchParam(sp.brand));
  const activeBrands =
    brandsParam.length > 0
      ? brandsParam
      : legacyBrand
        ? [legacyBrand]
        : [];

  const activeColors = parseProductsColorsParam(firstSearchParam(sp.colors));
  const activeSizes = parseProductsSizesParam(firstSearchParam(sp.sizes));
  let priceMin = parseProductsPriceMinParam(firstSearchParam(sp.price_min));
  let priceMax = parseProductsPriceMaxParam(firstSearchParam(sp.price_max));
  if (
    priceMin != null &&
    priceMax != null &&
    priceMin > priceMax
  ) {
    const t = priceMin;
    priceMin = priceMax;
    priceMax = t;
  }

  const supabase = await createSupabaseServerClient();
  const filterCategoryIds = categoryId
    ? []
    : parseProductsCategoriesFilterParam(firstSearchParam(sp.categories));

  const [catRes, allCategoryRows] = await Promise.all([
    categoryId
      ? supabase
          .from("categories")
          .select("name,listing_hero_image_path,listing_hero_alt_text")
          .eq("id", categoryId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getCachedAllCategoryRows(),
  ]);

  const cat = catRes.data;
  let categoryName: string | null = null;
  let categoryFilterId: string | null = null;
  let categoryListingHeroPath: string | null = null;
  let categoryListingHeroAlt: string | null = null;
  if (categoryId && cat?.name) {
    categoryName = cat.name;
    categoryFilterId = categoryId;
    categoryListingHeroPath =
      typeof cat.listing_hero_image_path === "string" &&
      cat.listing_hero_image_path.trim()
        ? cat.listing_hero_image_path.trim()
        : null;
    categoryListingHeroAlt =
      typeof cat.listing_hero_alt_text === "string" &&
      cat.listing_hero_alt_text.trim()
        ? cat.listing_hero_alt_text.trim()
        : null;
  }

  const categoryHeroResolvedSrc = categoryListingHeroPath
    ? resolveCategoryListingHeroSrc(categoryListingHeroPath)
    : null;
  const categoryView = Boolean(categoryFilterId && categoryName);
  const showCategoryListingHero = Boolean(
    categoryView && categoryHeroResolvedSrc,
  );

  let expandedCategoryIds: string[] | null = null;
  if (categoryFilterId) {
    expandedCategoryIds =
      allCategoryRows.length
        ? expandCategoryIdsFromRows(allCategoryRows, categoryFilterId)
      : await fetchExpandedCategoryIds(supabase, categoryFilterId);
  }

  let facetCategoryIds: string[] | null = expandedCategoryIds;
  if (
    !categoryFilterId &&
    filterCategoryIds.length > 0 &&
    allCategoryRows.length
  ) {
    facetCategoryIds = expandManyCategoryIdsFromRows(
      allCategoryRows,
      filterCategoryIds,
    );
  }
  if (!facetCategoryIds?.length) facetCategoryIds = null;

  const categoriesForFilterMenu = categoryFilterId
    ? []
    : mergeCategoryRowsForFilterMenu(allCategoryRows);

  const hasListingFilters =
    q.length > 0 ||
    activeBrands.length > 0 ||
    activeColors.length > 0 ||
    activeSizes.length > 0 ||
    filterCategoryIds.length > 0 ||
    priceMin != null ||
    priceMax != null ||
    sort !== "newest";

  const catalogBrowseMode = !categoryView && !hasListingFilters;

  type ListProduct = {
    id: string;
    name: string;
    brand: string;
    description: string | null;
    price_cents: number;
    has_vat?: boolean | null;
    image_path: string | null;
    stock_quantity: number;
    size_options?: unknown;
    size_value: number | null;
    size_unit: string | null;
    fragrance_options: string[] | null;
    created_at: string;
  };

  async function fetchFilteredList(): Promise<ListProduct[]> {
    if (catalogBrowseMode) return [];

    let query = withStorefrontImage(
      supabase
        .from("products")
        .select(
          "id,name,brand,description,price_cents,has_vat,image_path,stock_quantity,size_options,size_value,size_unit,fragrance_options,created_at",
        )
        .eq("is_published", true),
    );

    if (categoryFilterId && expandedCategoryIds?.length) {
      query = query.in("category_id", expandedCategoryIds);
    } else if (
      !categoryFilterId &&
      filterCategoryIds.length > 0 &&
      allCategoryRows.length
    ) {
      const expandedFilter = expandManyCategoryIdsFromRows(
        allCategoryRows,
        filterCategoryIds,
      );
      if (expandedFilter.length) {
        query = query.in("category_id", expandedFilter);
      }
    }

    if (activeBrands.length === 1) {
      query = query.eq("brand", activeBrands[0]!);
    } else if (activeBrands.length > 1) {
      query = query.in("brand", activeBrands);
    }

    if (activeColors.length > 0) {
      query = query.overlaps("colors", activeColors);
    }

    if (activeSizes.length >= 1) {
      query = query.or(
        activeSizes.map(productMatchesSizeFilterClause).join(","),
      );
    }

    if (priceMin != null) {
      query = query.gte("price_cents", priceMin);
    }
    if (priceMax != null) {
      query = query.lte("price_cents", priceMax);
    }

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    switch (sort) {
      case "price_asc":
        query = query.order("price_cents", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price_cents", { ascending: false });
        break;
      case "name":
        query = query.order("name", { ascending: true });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    query = query.limit(CATALOG_FILTERED_LIST_MAX);
    const { data: products } = await query;
    return products ?? [];
  }

  const [
    listingFacets,
    productsBanners,
    catalogSections,
    list,
    cartQtyByProductId,
    couponPctByProductId,
  ] = await Promise.all([
    getCachedListingFacets(facetCategoryIds),
    categoryView ? Promise.resolve([]) : getCachedPublishedBanners("products"),
    catalogBrowseMode && allCategoryRows.length
      ? getCachedCatalogBrowseSections(allCategoryRows)
      : Promise.resolve(null),
    fetchFilteredList(),
    getStorefrontCartQuantityByProductId(),
    getCachedStorefrontCouponDiscounts(),
  ]);

  const invalidCategory = Boolean(categoryId && !categoryName);

  const controlsKey = [
    categoryFilterId ?? "",
    activeBrands.join(","),
    activeColors.join("|"),
    activeSizes.map((s) => `${s.value}:${s.unit}`).join("|"),
    filterCategoryIds.join(","),
    priceMin ?? "",
    priceMax ?? "",
    sort,
    q,
  ].join("::");

  const catalogHeroBanner = productsBanners[0];

  return (
    <div className="min-w-0 bg-white">
      {catalogBrowseMode ? (
        <RevealOnScroll className="w-full">
          <CatalogListingHero
            title="CATÁLOGO"
            banner={
              catalogHeroBanner ?
                {
                  image_path: catalogHeroBanner.image_path,
                  alt_text: catalogHeroBanner.alt_text,
                }
              : null
            }
          />
        </RevealOnScroll>
      ) : null}

      {showCategoryListingHero &&
      categoryListingHeroPath &&
      categoryName &&
      categoryHeroResolvedSrc ? (
        <RevealOnScroll className="w-full">
          <CategoryListingHero
            imagePath={categoryListingHeroPath}
            title={categoryName}
            alt={categoryListingHeroAlt}
          />
        </RevealOnScroll>
      ) : null}

      {categoryView && categoryName && !showCategoryListingHero ? (
        <RevealOnScroll className="w-full">
          <header className={`${storeShellClass} border-b border-stone-100 pb-6 pt-8 text-center sm:pb-8 sm:pt-10`}>
            <h1 className="text-xl font-semibold uppercase tracking-[0.12em] text-[var(--store-brand)] sm:text-2xl">
              {categoryName}
            </h1>
          </header>
        </RevealOnScroll>
      ) : null}

      <div className="w-full bg-white">
        <div className={storeShellClass}>
          <RevealOnScroll className="w-full">
            <ProductsListingControls
              key={controlsKey}
              lockedCategoryId={categoryFilterId}
              facets={{
                brands: listingFacets.brands,
                colors: listingFacets.colors,
                sizes: listingFacets.sizes,
                priceMin: listingFacets.priceMin,
                priceMax: listingFacets.priceMax,
                categories: categoriesForFilterMenu,
              }}
              selection={{
                brands: activeBrands,
                colors: activeColors,
                sizes: activeSizes.map((s) => `${s.value}:${s.unit}`),
                categoryIds: filterCategoryIds,
                priceMin,
                priceMax,
              }}
              sort={sort}
              searchQuery={q}
            />
          </RevealOnScroll>
        </div>
      </div>

      <div
        className={`${storeShellClass} space-y-10 pb-10 pt-2 sm:space-y-12 sm:pb-12 sm:pt-3 lg:pb-14`}
      >
        {!categoryView && !catalogBrowseMode && productsBanners.length > 0 ? (
          <RevealOnScroll className="w-full">
            <StoreBannerCarousel
              variant="products"
              slides={productsBanners.map((b) => ({
                id: b.id,
                image_path: b.image_path,
                href: b.href,
                alt_text: b.alt_text,
              }))}
            />
          </RevealOnScroll>
        ) : null}

        {catalogBrowseMode ? (
          catalogSections && catalogSections.length > 0 ? (
            <CatalogBrowseSections
              sections={catalogSections}
              cartQtyByProductId={cartQtyByProductId}
              couponPctByProductId={couponPctByProductId}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-stone-200/80 bg-white/80 p-12 text-center text-stone-500">
              Aún no hay productos publicados. Cárgalos desde el admin.
            </p>
          )
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200/80 bg-white/80 p-12 text-center text-stone-500">
            {invalidCategory
              ? "Esa categoría no existe o fue eliminada. Vuelve al catálogo completo."
              : q
                ? "No hay productos que coincidan. Prueba otra búsqueda o orden."
                : categoryName
                  ? "Todavía no hay productos publicados en esta categoría."
                  : "Aún no hay productos publicados. Cárgalos desde el admin."}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10 xl:grid-cols-4">
            {list.map((p, index) => (
              <li key={p.id}>
                <RevealOnScroll
                  className="h-full"
                  delayMs={Math.min(index * 60, 420)}
                >
                  <ProductListingCard
                    accentImageBg={index % 4 === 3}
                    cartQuantity={cartQtyByProductId[p.id] ?? 0}
                    couponDiscountPercent={couponPctByProductId[p.id] ?? 0}
                    product={{
                      id: p.id,
                      name: p.name,
                      brand: p.brand,
                      description: p.description,
                      price_cents: p.price_cents,
                      has_vat: p.has_vat,
                      image_path: p.image_path,
                      stock_quantity: p.stock_quantity,
                      size_options: p.size_options,
                      size_value: p.size_value,
                      size_unit: p.size_unit,
                      fragrance_options: p.fragrance_options,
                    }}
                  />
                </RevealOnScroll>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
