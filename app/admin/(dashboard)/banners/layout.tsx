import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function BannersLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("marketing_ver");
  return children;
}
