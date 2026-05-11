import { FavoritosView } from "@/components/store/FavoritosView";
import { storeBrand } from "@/lib/brand";

export const metadata = {
  title: `Favoritos | ${storeBrand}`,
};

export default function FavoritosPage() {
  return <FavoritosView />;
}
