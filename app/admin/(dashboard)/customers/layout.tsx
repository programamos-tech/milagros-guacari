import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function CustomersLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("clientes_ver");
  return children;
}
