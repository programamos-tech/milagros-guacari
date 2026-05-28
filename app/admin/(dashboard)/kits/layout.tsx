import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function KitsLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("kits_ver");
  return children;
}
