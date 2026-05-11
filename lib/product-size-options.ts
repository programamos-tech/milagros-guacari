export type SizeOption = { value: number; unit: string };

export const SIZE_UNITS = ["ml", "l", "g", "kg", "oz", "unidad"] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

function normalizeUnit(u: string): SizeUnit {
  const t = u.trim().toLowerCase();
  return SIZE_UNITS.includes(t as SizeUnit) ? (t as SizeUnit) : "unidad";
}

export function formatSizeOption(o: SizeOption): string {
  const num = String(o.value).replace(/\.0+$/, "");
  return `${num} ${o.unit}`;
}

/** Parsea filas del formulario: `size_option_value` + `size_option_unit` alineados por índice. */
export function parseSizeOptionsFromFormData(formData: FormData): SizeOption[] {
  const values = formData.getAll("size_option_value").map((v) => String(v));
  const units = formData.getAll("size_option_unit").map((v) => String(v));
  const n = Math.max(values.length, units.length);
  const seen = new Set<string>();
  const out: SizeOption[] = [];
  for (let i = 0; i < n; i++) {
    const rawV = (values[i] ?? "").trim().replace(",", ".");
    if (!rawV) continue;
    const num = Number(rawV);
    if (!Number.isFinite(num) || num <= 0) continue;
    const unit = normalizeUnit(units[i] ?? "unidad");
    const value = Number(num.toFixed(2));
    const key = `${value}:${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value, unit });
  }
  return out;
}

function parseJsonSizeOptions(raw: unknown): SizeOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: SizeOption[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const v = Number(o.value);
    if (!Number.isFinite(v) || v <= 0) continue;
    const unit = normalizeUnit(String(o.unit ?? "unidad"));
    const value = Number(v.toFixed(2));
    const key = `${value}:${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value, unit });
  }
  return out.length ? out : null;
}

/** Une columna `size_options` (JSON) con legacy `size_value` / `size_unit`. */
export function normalizeSizeOptionsFromRow(row: {
  size_options?: unknown;
  size_value?: number | null;
  size_unit?: string | null;
}): SizeOption[] {
  const fromJson = parseJsonSizeOptions(row.size_options);
  if (fromJson?.length) return fromJson;

  const sv = row.size_value;
  if (sv != null && Number(sv) > 0) {
    const unit = normalizeUnit(String(row.size_unit ?? "unidad"));
    return [{ value: Number(Number(sv).toFixed(2)), unit }];
  }
  return [];
}

/** Primera presentación para columnas legacy y filtros del catálogo. */
export function legacySizeFromOptions(
  opts: SizeOption[],
): { size_value: number | null; size_unit: string | null } {
  if (opts.length === 0) return { size_value: null, size_unit: null };
  const first = opts[0];
  return { size_value: first.value, size_unit: first.unit };
}

/** Una línea para tarjetas del catálogo (mayúsculas como antes). */
export function catalogSizeSummaryLine(row: {
  size_options?: unknown;
  size_value?: number | null;
  size_unit?: string | null;
}): string | null {
  const opts = normalizeSizeOptionsFromRow(row);
  if (opts.length === 0) return null;
  const joined = opts.map(formatSizeOption).join(" · ");
  return joined.toUpperCase();
}
