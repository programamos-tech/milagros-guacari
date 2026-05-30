"use client";

import { createCategory } from "@/app/actions/admin/categories";
import { AdminFormSubmitButton } from "@/components/admin/AdminFormSubmitButton";

const inputClass =
  "w-full rounded-lg border-0 bg-stone-100 px-3 py-2.5 text-stone-900 focus:ring-2 focus:ring-[#6b7f6a]";

export function CategoryCreateForm() {
  return (
    <form action={createCategory} className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="font-semibold text-stone-800">Nombre</span>
        <input
          name="name"
          required
          className={inputClass}
          placeholder="Ej. Audio, Hogar, Ofertas"
        />
      </label>
      <AdminFormSubmitButton
        pendingLabel="Creando…"
        className="rounded-full bg-[#3d5240] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#556654] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Crear categoría
      </AdminFormSubmitButton>
    </form>
  );
}
