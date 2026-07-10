import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function EnviosLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("ajustes_tienda_ver");
  return children;
}
