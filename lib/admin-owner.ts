/** Nombre visible del propietario en el panel admin (sidebar, barra superior). */
export const adminOwnerDisplayName =
  process.env.NEXT_PUBLIC_ADMIN_OWNER_NAME ?? "Milagros Guacarí";

/** Correo visible; por defecto el de la plataforma. */
export const adminOwnerEmail = (
  process.env.NEXT_PUBLIC_ADMIN_OWNER_EMAIL ??
  process.env.NEXT_PUBLIC_PLATFORM_EMAIL ??
  ""
).trim();

/**
 * Semilla estable para DiceBear Notionists (mismo correo → mismo personaje).
 * Opcional: `NEXT_PUBLIC_ADMIN_OWNER_AVATAR_SEED` para fijar un avatar concreto.
 */
export const adminOwnerAvatarSeed =
  process.env.NEXT_PUBLIC_ADMIN_OWNER_AVATAR_SEED?.trim() ||
  adminOwnerEmail.toLowerCase() ||
  adminOwnerDisplayName.toLowerCase();
