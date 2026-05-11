import { requireAdminAnyPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  await requireAdminAnyPermission(["inventario_ver", "marketing_ver"]);
  return children;
}
