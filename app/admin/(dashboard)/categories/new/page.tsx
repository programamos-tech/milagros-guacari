import Link from "next/link";
import { createCategory } from "@/app/actions/admin/categories";

const inputClass =
  "w-full rounded-lg border-0 bg-stone-100 px-3 py-2.5 text-stone-900 focus:ring-2 focus:ring-[#6b7f6a]";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/admin/products?categories=1"
        className="text-sm font-medium text-[#556654] hover:underline"
      >
        ← Categorías
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">
          Nueva categoría
        </h1>
        <p className="mt-1 text-stone-600">
          Un nombre claro ayuda a ordenar el catálogo.
        </p>
      </div>
      {error === "name" ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900 ring-1 ring-red-100">
          Ingresa un nombre.
        </p>
      ) : null}
      {error === "db" ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900 ring-1 ring-red-100">
          No se pudo guardar.
        </p>
      ) : null}
      <form action={createCategory} className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-stone-800">Nombre</span>
          <input name="name" required className={inputClass} placeholder="Ej. Audio, Hogar, Ofertas" />
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#3d5240] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#556654]"
        >
          Crear categoría
        </button>
      </form>
    </div>
  );
}
