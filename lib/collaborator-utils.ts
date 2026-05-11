/** Usuario corto para acceso: minúsculas, sin espacios ni acentos. */
export function slugUsername(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32)
    .trim();
  return base.length > 0 ? base : "usuario";
}
