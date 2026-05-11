/** Solo dígitos, mínimo 6 (cédula / documento). Uso en cliente y servidor. */
export function normalizeDocumentIdForMatch(
  raw: string | null | undefined,
): string | null {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const d = String(raw).replace(/\D/g, "");
  if (d.length < 6 || d.length > 15) {
    return null;
  }
  return d;
}
