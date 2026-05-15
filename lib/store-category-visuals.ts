import { normalizeCategoryLabel } from "@/lib/store-category-group";

export type StoreCategoryVisual = {
  tint: string;
  sub: string;
};

const VISUAL_BY_NAME: Record<string, StoreCategoryVisual> = {
  "Cuidado del cabello": {
    tint: "bg-[#fceef3]",
    sub: "Tratamientos y styling",
  },
  "Cuidado corporal": {
    tint: "bg-[#eef4ec]",
    sub: "Cuidado del cuerpo",
  },
  Perfumes: {
    tint: "bg-[#f8eef5]",
    sub: "Fragancias",
  },
  "Vitaminas y suplementos": {
    tint: "bg-[#f0f4e8]",
    sub: "Bienestar y energía",
  },
  Accesorios: {
    tint: "bg-[#faf3ee]",
    sub: "Detalles y complementos",
  },
  "Cuidado de la piel": {
    tint: "bg-[#fceef3]",
    sub: "Skincare",
  },
  Maquillaje: {
    tint: "bg-[#f5e8f0]",
    sub: "Belleza",
  },
  Termos: {
    tint: "bg-[#e8f0f4]",
    sub: "Bebidas y más",
  },
  Joyería: {
    tint: "bg-[#fdf6f0]",
    sub: "Brillo y estilo",
  },
  Ropa: {
    tint: "bg-[#f0ecf8]",
    sub: "Indumentaria",
  },
  Bolsos: {
    tint: "bg-[#faf3ee]",
    sub: "Carteras y más",
  },
  Zapatos: {
    tint: "bg-[#eef2f6]",
    sub: "Calzado",
  },
};

const FALLBACK_ACCENTS: StoreCategoryVisual[] = [
  { tint: "bg-[#fff0f5]", sub: "" },
  { tint: "bg-[#fce8ef]", sub: "" },
  { tint: "bg-[#fceef3]", sub: "" },
];

const VISUAL_BY_NORMALIZED: Record<string, StoreCategoryVisual> = {};
for (const [label, visual] of Object.entries(VISUAL_BY_NAME)) {
  VISUAL_BY_NORMALIZED[normalizeCategoryLabel(label)] = visual;
}

export function getStoreCategoryVisual(
  name: string,
  fallbackIndex = 0,
): StoreCategoryVisual {
  const key = normalizeCategoryLabel(name.trim());
  const v = VISUAL_BY_NORMALIZED[key];
  if (v) return v;
  return FALLBACK_ACCENTS[fallbackIndex % FALLBACK_ACCENTS.length]!;
}
