import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function EgresosLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("egresos_ver");
  return children;
}
