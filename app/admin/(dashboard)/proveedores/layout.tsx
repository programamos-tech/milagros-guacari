import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function ProveedoresLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("proveedores_ver");
  return children;
}
