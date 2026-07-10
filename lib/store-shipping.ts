import { formatCop } from "@/lib/money";

export type StoreShippingMunicipalityRow = {
  id: string;
  name: string;
  department: string | null;
  rate_cents: number;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StoreShippingMunicipalityPublic = {
  id: string;
  name: string;
  department: string | null;
  rate_cents: number;
};

/** Valor especial del select de checkout: municipio no listado. */
export const SHIPPING_CITY_OTHER = "__other__";

export function normalizeMunicipalityName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function municipalityDisplayLabel(row: {
  name: string;
  department?: string | null;
}): string {
  const dept = row.department?.trim();
  return dept ? `${row.name} (${dept})` : row.name;
}

export function storeShippingAdminErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "name":
      return "El nombre del municipio es obligatorio.";
    case "rate":
      return "El precio de envío no es válido.";
    case "duplicate":
      return "Ya existe un municipio con ese nombre.";
    case "not_found":
      return "No encontramos ese municipio.";
    case "db":
      return "No pudimos guardar. Intenta de nuevo.";
    default:
      return "Ocurrió un error. Intenta de nuevo.";
  }
}

export function resolveCheckoutShippingCents(opts: {
  rateCents: number;
  subtotalCents: number;
  freeShippingQualified: boolean;
}): number {
  if (opts.freeShippingQualified) return 0;
  return Math.max(0, Math.floor(opts.rateCents));
}

export function formatShippingRateLabel(rateCents: number): string {
  if (rateCents <= 0) return "Gratis";
  return formatCop(rateCents);
}
