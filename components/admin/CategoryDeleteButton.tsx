"use client";

import { deleteCategory } from "@/app/actions/admin/categories";

export function CategoryDeleteButton({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  return (
    <form action={deleteCategory.bind(null, categoryId)} className="inline">
      <button
        type="submit"
        className="text-sm font-medium text-red-700 hover:underline"
        onClick={(e) => {
          if (
            !confirm(
              `¿Eliminar categoría «${categoryName}»? Los productos quedarán sin categoría.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        Eliminar
      </button>
    </form>
  );
}
