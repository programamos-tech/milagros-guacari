import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function ProductsLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("inventario_ver");
  return children;
}
