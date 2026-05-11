import { CategoryListingHero } from "@/components/store/CategoryListingHero";
import { resolveCategoryListingHeroSrc } from "@/lib/category-listing-hero-url";

type Props = {
  title: string;
  banner?: {
    image_path: string;
    alt_text: string | null;
  } | null;
};

/**
 * Hero del catálogo completo (/products en modo exploración).
 * La imagen sale del **primer banner publicado** con placement `products`
 * (Administración → Banners → “Catálogo / listado de productos”).
 * Si no hay banner o la imagen no resuelve URL → no se renderiza nada (solo catálogo).
 */
export function CatalogListingHero({ title, banner }: Props) {
  const rawPath = banner?.image_path?.trim();
  const src = rawPath ? resolveCategoryListingHeroSrc(rawPath) : null;

  if (!src || !rawPath) {
    return null;
  }

  return (
    <CategoryListingHero
      imagePath={rawPath}
      title={title}
      alt={banner?.alt_text?.trim() || title}
    />
  );
}
