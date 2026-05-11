/** Semilla estable por cliente (mismo avatar siempre). Preferimos email; si no, id. */
export function customerAvatarSeed(id: string, email: string | null | undefined): string {
  const e = email?.trim();
  return e ? e.toLowerCase() : id;
}
