import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function ActividadesLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("actividades_ver");
  return children;
}
