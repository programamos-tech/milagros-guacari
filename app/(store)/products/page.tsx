import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogBrowseSections } from "@/components/store/CatalogBrowseSections";
import { CatalogKitsSection } from "@/components/store/CatalogKitsSection";
import { CatalogListingHero } from "@/components/store/CatalogListingHero";
import { CatalogPagination } from "@/components/store/CatalogPagination";
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
import {
  getStorefrontCartQuantityByKitId,
  getStorefrontCartQuantityByProductId,
} from "@/lib/storefront-cart";
import { resolveCategoryListingHeroSrc } from "@/lib/category-listing-hero-url";
import {
  getCachedAllCategoryRows,
  getCachedCatalogBrowseSections,
  getCachedCatalogKits,
  getCachedListingFacets,
  getCachedPublishedBanners,
  getCachedStorefrontCouponDiscounts,
} from "@/lib/store-public-cache";
import { STORE_CARD_PRIORITY_COUNT } from "@/lib/store-image";
import { storeShellClass } from "@/lib/store-theme";
import { withStorefrontImage } from "@/lib/storefront-product-image";

/** Productos por página en listado filtrado (antes hasta 300 en un solo HTML). */
const CATALOG_PAGE_SIZE = 24;

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
    page?: string | string[];
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
  const pageRaw = firstSearchParam(sp.page);
  const pageParsed = Number.parseInt(pageRaw, 10);
  const page =
    Number.isFinite(pageParsed) && pageParsed > 0 ? Math.floor(pageParsed) : 1;
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

  async function fetchFilteredList(pageNum: number): Promise<{
    products: ListProduct[];
    total: number;
  }> {
    if (catalogBrowseMode) return { products: [], total: 0 };

    let query = withStorefrontImage(
      supabase
        .from("products")
        .select(
          // Sin `description`: no se muestra en cards y ahorra HTML/RSC.
          "id,name,brand,price_cents,has_vat,image_path,stock_quantity,size_options,size_value,size_unit,fragrance_options,created_at",
          { count: "exact" },
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

    const safePage = Math.max(1, pageNum);
    const from = (safePage - 1) * CATALOG_PAGE_SIZE;
    const to = from + CATALOG_PAGE_SIZE - 1;
    const { data: products, count } = await query.range(from, to);
    return {
      products: (products ?? []) as ListProduct[],
      total: typeof count === "number" ? count : (products?.length ?? 0),
    };
  }

  const [
    listingFacets,
    productsBanners,
    catalogSections,
    catalogKits,
    listResultInitial,
    cartQtyByProductId,
    cartQtyByKitId,
    couponPctByProductId,
  ] = await Promise.all([
    getCachedListingFacets(facetCategoryIds),
    categoryView ? Promise.resolve([]) : getCachedPublishedBanners("products"),
    catalogBrowseMode && allCategoryRows.length
      ? getCachedCatalogBrowseSections(allCategoryRows)
      : Promise.resolve(null),
    catalogBrowseMode
      ? getCachedCatalogKits()
      : Promise.resolve([]),
    fetchFilteredList(page),
    getStorefrontCartQuantityByProductId(),
    catalogBrowseMode
      ? getStorefrontCartQuantityByKitId()
      : Promise.resolve({} as Record<string, number>),
    getCachedStorefrontCouponDiscounts(),
  ]);

  let listResult = listResultInitial;
  const totalPages = Math.max(
    1,
    Math.ceil(listResult.total / CATALOG_PAGE_SIZE) || 1,
  );
  const currentPage = Math.min(Math.max(1, page), totalPages);
  if (currentPage !== page && listResult.total > 0) {
    listResult = await fetchFilteredList(currentPage);
  }
  const list = listResult.products;

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

  const paginationParams = new URLSearchParams();
  if (q) paginationParams.set("q", q);
  if (sort !== "newest") paginationParams.set("sort", sort);
  if (categoryFilterId) paginationParams.set("category", categoryFilterId);
  if (activeBrands.length === 1) {
    paginationParams.set("brand", activeBrands[0]!);
  } else if (activeBrands.length > 1) {
    paginationParams.set("brands", activeBrands.join(","));
  }
  if (activeColors.length) {
    paginationParams.set("colors", activeColors.join("|"));
  }
  if (activeSizes.length) {
    paginationParams.set(
      "sizes",
      activeSizes.map((s) => `${s.value}:${s.unit}`).join("|"),
    );
  }
  if (filterCategoryIds.length) {
    paginationParams.set("categories", filterCategoryIds.join(","));
  }
  if (priceMin != null) paginationParams.set("price_min", String(priceMin));
  if (priceMax != null) paginationParams.set("price_max", String(priceMax));
  const paginationBaseQuery = paginationParams.toString();

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
          catalogKits.length > 0 ||
          (catalogSections && catalogSections.length > 0) ? (
            <div className="space-y-12 sm:space-y-14">
              {catalogKits.length > 0 ? (
                <CatalogKitsSection
                  kits={catalogKits}
                  cartQtyByKitId={cartQtyByKitId}
                />
              ) : null}
              {catalogSections && catalogSections.length > 0 ? (
                <CatalogBrowseSections
                  sections={catalogSections}
                  cartQtyByProductId={cartQtyByProductId}
                  couponPctByProductId={couponPctByProductId}
                />
              ) : null}
            </div>
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
          <div className="space-y-10">
            <ul className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10 xl:grid-cols-4">
              {list.map((p, index) => (
                <li key={p.id}>
                  <RevealOnScroll
                    className="h-full"
                    delayMs={Math.min(index * 40, 240)}
                  >
                    <ProductListingCard
                      accentImageBg={index % 4 === 3}
                      priority={index < STORE_CARD_PRIORITY_COUNT}
                      cartQuantity={cartQtyByProductId[p.id] ?? 0}
                      couponDiscountPercent={couponPctByProductId[p.id] ?? 0}
                      product={{
                        id: p.id,
                        name: p.name,
                        brand: p.brand,
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
            <CatalogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseQuery={paginationBaseQuery}
            />
          </div>
        )}
      </div>
    </div>
  );
}
