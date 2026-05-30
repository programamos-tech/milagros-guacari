import { updateTag } from "next/cache";

/** Invalida caché pública de categorías y menú tienda. */
export function revalidateStoreCategoriesTag() {
  updateTag("store-categories");
}

/** Invalida caché pública de productos, facets y browse. */
export function revalidateStoreProductsTag() {
  updateTag("store-products");
}

export function revalidateStoreBannersTag() {
  updateTag("store-banners");
}

export function revalidateStoreCouponsTag() {
  updateTag("store-coupons");
}

export function revalidateStoreWelcomeModalTag() {
  updateTag("store-welcome-modal");
}

/** Productos o categorías cambiaron en admin. */
export function revalidateStoreCatalogTags() {
  revalidateStoreCategoriesTag();
  revalidateStoreProductsTag();
}
