import Link from "next/link";

const blocks = [
  {
    href: "/admin/products",
    title: "Productos",
    body: "Crea y edita ítems, precios en pesos, stock y publicación.",
    tone: "bg-[#d8e5d4]",
  },
  {
    href: "/admin/products?categories=1",
    title: "Categorías",
    body: "Crea grupos y asígnalos a cada producto desde su ficha.",
    tone: "bg-[#e8e4d4]",
  },
  {
    href: "/admin/banners",
    title: "Banners",
    body: "Imágenes destacadas en home y listados (próxima versión).",
    tone: "bg-[#edd8cc]",
  },
] as const;

export default function AdminCatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
          Catálogo
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Todo lo que define qué se vende y cómo se muestra en la tienda.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {blocks.map((b) => (
          <li key={b.href}>
            <Link
              href={b.href}
              className={`flex min-h-[160px] flex-col justify-between rounded-2xl p-5 shadow-sm ring-1 ring-stone-200/60 transition hover:shadow-md ${b.tone}`}
            >
              <span className="text-lg font-semibold text-stone-900">
                {b.title}
              </span>
              <p className="text-sm text-stone-700/90">{b.body}</p>
              <span className="mt-3 text-sm font-medium text-[#556654]">
                Ir →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
