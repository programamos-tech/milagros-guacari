import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function CategoriesLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("categorias_gestionar");
  return children;
}
