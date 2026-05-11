/** Claves de permisos del panel (persistidas en `profiles.permissions`). */
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Rol laboral del colaborador (columna `profiles.job_role`). */
export type CollaboratorJobRole = "owner" | "cashier" | "support";

export function normalizeCollaboratorJobRole(
  raw: string | null | undefined,
): CollaboratorJobRole {
  if (raw === "owner") return "owner";
  if (raw === "support") return "support";
  return "cashier";
}

export const PERMISSION_KEYS = [
  "inicio_reportes",
  "ventas_ver",
  "ventas_crear",
  "clientes_ver",
  "clientes_crear",
  "clientes_editar",
  "egresos_ver",
  "egresos_crear",
  "proveedores_ver",
  "inventario_ver",
  "productos_crear",
  "productos_editar",
  "categorias_gestionar",
  "stock_actualizar",
  "stock_transferir",
  "roles_ver",
  "colaboradores_gestionar",
  "sucursales_ver",
  "sucursales_gestionar",
  "actividades_ver",
  "marketing_ver",
  "ajustes_tienda_ver",
] as const;

export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

export type PermissionItem = {
  key: PermissionKey;
  label: string;
  /** Solo informativo en UI (ej. siempre visible para auditoría). */
  readOnly?: boolean;
};

export type PermissionModule = {
  id: string;
  label: string;
  items: PermissionItem[];
};

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "inicio",
    label: "Inicio",
    items: [{ key: "inicio_reportes", label: "Inicio / Reportes" }],
  },
  {
    id: "ventas",
    label: "Ventas",
    items: [
      { key: "ventas_ver", label: "Ventas" },
      { key: "ventas_crear", label: "Crear ventas" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    items: [
      { key: "clientes_ver", label: "Ver clientes" },
      { key: "clientes_crear", label: "Crear clientes" },
      { key: "clientes_editar", label: "Editar clientes" },
    ],
  },
  {
    id: "egresos",
    label: "Egresos",
    items: [
      { key: "egresos_ver", label: "Ver egresos" },
      { key: "egresos_crear", label: "Crear egresos" },
    ],
  },
  {
    id: "proveedores",
    label: "Proveedores",
    items: [{ key: "proveedores_ver", label: "Proveedores y facturas de compra" }],
  },
  {
    id: "inventario",
    label: "Inventario",
    items: [
      { key: "inventario_ver", label: "Ver inventario" },
      { key: "productos_crear", label: "Crear productos" },
      { key: "productos_editar", label: "Editar productos" },
      { key: "categorias_gestionar", label: "Gestionar categorías" },
      { key: "stock_actualizar", label: "Actualizar stock" },
      { key: "stock_transferir", label: "Transferir stock" },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    items: [
      { key: "roles_ver", label: "Ver roles" },
      { key: "colaboradores_gestionar", label: "Gestionar colaboradores" },
      { key: "sucursales_ver", label: "Ver sucursales" },
      { key: "sucursales_gestionar", label: "Gestionar sucursales" },
      { key: "actividades_ver", label: "Ver actividades", readOnly: true },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [{ key: "marketing_ver", label: "Banners y cupones" }],
  },
  {
    id: "tienda",
    label: "Tienda",
    items: [{ key: "ajustes_tienda_ver", label: "Ajustes de tienda y bienvenida" }],
  },
];

function allTrue(): PermissionMap {
  const m: PermissionMap = {};
  for (const k of PERMISSION_KEYS) {
    m[k] = true;
  }
  return m;
}

/** Dueño: todo habilitado. */
export function defaultPermissionsOwner(): PermissionMap {
  return allTrue();
}

/** Cajero: alineado al mock (inventario lectura + ventas; sin admin). */
export function defaultPermissionsCashier(): PermissionMap {
  const m: PermissionMap = {};
  for (const k of PERMISSION_KEYS) m[k] = false;
  m.inicio_reportes = true;
  m.ventas_ver = true;
  m.ventas_crear = true;
  m.clientes_ver = true;
  m.clientes_crear = true;
  m.clientes_editar = true;
  m.egresos_ver = true;
  m.egresos_crear = true;
  m.proveedores_ver = true;
  m.inventario_ver = true;
  m.actividades_ver = true;
  m.marketing_ver = false;
  m.ajustes_tienda_ver = false;
  return m;
}

/**
 * Apoyo: refuerzo en depósito / datos sin operar caja como cajero principal.
 * (Misma base que cajero; afiná permisos con los checkboxes.)
 */
export function defaultPermissionsSupport(): PermissionMap {
  return defaultPermissionsCashier();
}

export function permissionsFromRoleTemplate(role: CollaboratorJobRole): PermissionMap {
  if (role === "owner") return defaultPermissionsOwner();
  if (role === "support") return defaultPermissionsSupport();
  return defaultPermissionsCashier();
}

export function normalizePermissions(raw: unknown): PermissionMap {
  if (!raw || typeof raw !== "object") return {};
  const out: PermissionMap = {};
  for (const k of PERMISSION_KEYS) {
    if (k in (raw as object)) {
      out[k] = Boolean((raw as Record<string, unknown>)[k]);
    }
  }
  return out;
}

export function mergePermissionsWithDefaults(
  stored: PermissionMap | null | undefined,
  fallbackRole: CollaboratorJobRole,
): PermissionMap {
  const base = permissionsFromRoleTemplate(fallbackRole);
  const s = stored ?? {};
  const out: PermissionMap = { ...base };
  for (const k of PERMISSION_KEYS) {
    if (k in s) out[k] = Boolean(s[k]);
  }
  return out;
}
