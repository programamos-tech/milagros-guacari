export const PRODUCT_COLOR_OPTIONS = [
  "Negro",
  "Blanco",
  "Rojo",
  "Azul",
  "Verde",
  "Rosa",
  "Morado",
  "Amarillo",
  "Gris",
  "Beige",
  "Dorado",
  "Plateado",
] as const;

export function productColorSwatchClass(color: string): string {
  switch (color.trim().toLowerCase()) {
    case "negro":
      return "bg-stone-900";
    case "blanco":
      return "bg-white border border-stone-300";
    case "rojo":
      return "bg-rose-600";
    case "azul":
      return "bg-sky-600";
    case "verde":
      return "bg-emerald-600";
    case "rosa":
      return "bg-pink-400";
    case "morado":
      return "bg-violet-600";
    case "amarillo":
      return "bg-amber-400";
    case "gris":
      return "bg-zinc-400";
    case "beige":
      return "bg-stone-300";
    case "dorado":
      return "bg-yellow-500";
    case "plateado":
      return "bg-slate-300";
    default:
      return "bg-stone-500";
  }
}
