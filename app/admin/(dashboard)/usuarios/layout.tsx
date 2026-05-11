import { requireAdminPermission } from "@/lib/require-admin-permission";
import type { ReactNode } from "react";

export default async function UsuariosLayout({ children }: { children: ReactNode }) {
  await requireAdminPermission("roles_ver");
  return children;
}
