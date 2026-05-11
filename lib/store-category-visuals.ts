export type StoreCategoryVisual = {
  tint: string;
  sub: string;
};

const VISUAL_BY_NAME: Record<string, StoreCategoryVisual> = {
  "Cuidado corporal": {
    tint: "bg-[#eef4ec]",
    sub: "Cuidado del cuerpo",
  },
  "Vitaminas y suplementos": {
    tint: "bg-[#f0f4e8]",
    sub: "Bienestar y energia",
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
    sub: "Bebidas y mas",
  },
  Ropa: {
    tint: "bg-[#f0ecf8]",
    sub: "Indumentaria",
  },
  Bolsos: {
    tint: "bg-[#faf3ee]",
    sub: "Accesorios",
  },
  Zapatos: {
    tint: "bg-[#eef2f6]",
    sub: "Calzado",
  },
};

const FALLBACK_ACCENTS: StoreCategoryVisual[] = [
  { tint: "bg-[#faf8f5]", sub: "Catalogo" },
  { tint: "bg-[#f3eff6]", sub: "Catalogo" },
  { tint: "bg-[#ecf4f6]", sub: "Catalogo" },
];

export function getStoreCategoryVisual(
  name: string,
  fallbackIndex = 0,
): StoreCategoryVisual {
  const v = VISUAL_BY_NAME[name.trim()];
  if (v) return v;
  return FALLBACK_ACCENTS[fallbackIndex % FALLBACK_ACCENTS.length]!;
}
