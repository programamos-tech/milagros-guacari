import type { PermissionMap } from "@/lib/admin-permissions";

/**
 * Primera ruta útil del panel según permisos (cuando no puede ver reportes en /admin).
 */
export function adminLandingPath(permissions: PermissionMap): string {
  if (permissions.inicio_reportes) return "/admin";
  if (permissions.ventas_ver) return "/admin/ventas";
  if (permissions.clientes_ver) return "/admin/customers";
  if (permissions.egresos_ver) return "/admin/egresos";
  if (permissions.proveedores_ver) return "/admin/proveedores";
  if (permissions.inventario_ver) return "/admin/products";
  if (permissions.marketing_ver) return "/admin/banners";
  if (permissions.roles_ver) return "/admin/usuarios";
  if (permissions.ajustes_tienda_ver) return "/admin/settings";
  if (permissions.actividades_ver) return "/admin/actividades";
  return "/admin/cuenta";
}
