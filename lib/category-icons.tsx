import type { LucideIcon } from "lucide-react";
import {
  Footprints,
  HandHeart,
  Paintbrush,
  Pill,
  Shirt,
  ShoppingBag,
  Sparkles,
  Tag,
  Thermometer,
} from "lucide-react";

export const CATEGORY_ICON_OPTIONS = [
  { key: "hand-heart", label: "Cuidado corporal", Icon: HandHeart },
  { key: "pill", label: "Vitaminas y suplementos", Icon: Pill },
  { key: "sparkles", label: "Cuidado de la piel", Icon: Sparkles },
  { key: "paintbrush", label: "Maquillaje", Icon: Paintbrush },
  { key: "thermometer", label: "Termos", Icon: Thermometer },
  { key: "shirt", label: "Ropa", Icon: Shirt },
  { key: "shopping-bag", label: "Bolsos", Icon: ShoppingBag },
  { key: "footprints", label: "Zapatos", Icon: Footprints },
  { key: "tag", label: "General", Icon: Tag },
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_OPTIONS)[number]["key"];

const CATEGORY_ICON_MAP: Record<CategoryIconKey, LucideIcon> = {
  "hand-heart": HandHeart,
  pill: Pill,
  sparkles: Sparkles,
  paintbrush: Paintbrush,
  thermometer: Thermometer,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  footprints: Footprints,
  tag: Tag,
};

const CATEGORY_ICON_KEY_SET = new Set<CategoryIconKey>(
  CATEGORY_ICON_OPTIONS.map((o) => o.key),
);

export function isCategoryIconKey(v: string): v is CategoryIconKey {
  return CATEGORY_ICON_KEY_SET.has(v as CategoryIconKey);
}

export function resolveCategoryIconKey(v: string | null | undefined): CategoryIconKey {
  if (!v) return "tag";
  const key = v.trim();
  if (isCategoryIconKey(key)) return key;
  return "tag";
}

export function getCategoryIconComponent(key: CategoryIconKey): LucideIcon {
  return CATEGORY_ICON_MAP[key];
}
