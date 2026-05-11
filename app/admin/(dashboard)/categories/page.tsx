import { redirect } from "next/navigation";

/** Las categorías se gestionan en un modal sobre `/admin/products`. */
export default function AdminCategoriesRedirectPage() {
  redirect("/admin/products?categories=1");
}
