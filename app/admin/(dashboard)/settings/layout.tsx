import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("ajustes_tienda_ver");
  return children;
}
