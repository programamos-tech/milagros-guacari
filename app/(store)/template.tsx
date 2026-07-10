import { StorePageEnter } from "@/components/store/StorePageEnter";

/**
 * Remonta en cada navegación del segmento tienda → anima la entrada.
 */
export default function StoreTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorePageEnter>{children}</StorePageEnter>;
}
