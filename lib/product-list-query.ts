/** UUID en forma normalizada (minúsculas) para coincidir con filas de Supabase/Postgres. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** `category` en query string: solo UUID válido (normalizado a minúsculas). */
export function parseProductsCategoryId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!UUID_RE.test(s)) return null;
  return s;
}

/** `brand` en query string: texto corto (coincidencia exacta en BD, trim). */
export function parseProductsBrandFilter(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > 160) return null;
  return s;
}

/** `brands=a,b,c` — varias marcas (AND implícito en listado: producto en cualquiera). */
export function parseProductsBrandsParam(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (p.length > 160) continue;
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.slice(0, 24);
}

/** `colors=Rojo|Azul` — separador `|` para evitar conflictos con comas en nombres. */
export function parseProductsColorsParam(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (p.length > 64) continue;
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.slice(0, 32);
}

const SIZE_UNIT_ALLOW = new Set([
  "ml",
  "l",
  "g",
  "kg",
  "oz",
  "unidad",
]);

/** `sizes=473:ml|600:ml` */
export function parseProductsSizesParam(raw: unknown): { value: number; unit: string }[] {
  if (typeof raw !== "string") return [];
  const pairs = raw.split("|").map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: { value: number; unit: string }[] = [];
  for (const pair of pairs) {
    const i = pair.indexOf(":");
    if (i < 1) continue;
    const num = Number(pair.slice(0, i).trim().replace(",", "."));
    const unit = pair.slice(i + 1).trim().toLowerCase();
    if (!Number.isFinite(num) || num <= 0 || !SIZE_UNIT_ALLOW.has(unit)) continue;
    const rounded = Number(num.toFixed(2));
    const key = `${rounded}:${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value: rounded, unit });
  }
  return out.slice(0, 24);
}

/** `categories=id1,id2` — UUID canónicos del filtro (catálogo sin categoría fija). */
export function parseProductsCategoriesFilterParam(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const id = p.trim().toLowerCase();
    if (!UUID_RE.test(id)) continue;
    out.push(id);
    if (out.length >= 16) break;
  }
  return out;
}

function parsePriceInt(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/\./g, "").replace(",", "");
  if (!s) return null;
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, 999_999_999);
}

export function parseProductsPriceMinParam(raw: unknown): number | null {
  return parsePriceInt(raw);
}

export function parseProductsPriceMaxParam(raw: unknown): number | null {
  return parsePriceInt(raw);
}
