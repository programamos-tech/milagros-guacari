import type { PermissionKey } from "@/lib/admin-permissions";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { redirect } from "next/navigation";

/** Redirección cuando una acción o página requiere un permiso que el usuario no tiene. */
export const ADMIN_FORBIDDEN_REDIRECT = "/admin/cuenta?notice=forbidden";

export async function requireAdminSession() {
  const perm = await loadAdminPermissions();
  if (!perm) redirect("/admin/login");
  return perm;
}

/** Exige un permiso concreto (AND implícito de un solo elemento). */
export async function requireAdminPermission(key: PermissionKey) {
  const perm = await requireAdminSession();
  if (!perm.permissions[key]) redirect(ADMIN_FORBIDDEN_REDIRECT);
  return perm;
}

/** Exige al menos uno de los permisos listados. */
export async function requireAdminAnyPermission(keys: PermissionKey[]) {
  const perm = await requireAdminSession();
  if (!keys.length || !keys.some((k) => perm.permissions[k])) {
    redirect(ADMIN_FORBIDDEN_REDIRECT);
  }
  return perm;
}

/** Para server actions: misma regla que las páginas (redirect). */
export async function assertActionPermission(key: PermissionKey): Promise<void> {
  await requireAdminPermission(key);
}
