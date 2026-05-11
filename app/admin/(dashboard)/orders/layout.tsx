import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function OrdersLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("ventas_ver");
  return children;
}
