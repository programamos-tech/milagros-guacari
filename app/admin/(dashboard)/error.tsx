"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin dashboard]", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-6 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
      <p className="font-semibold">No se pudo cargar esta sección del panel</p>
      <p className="mt-2 text-red-900/90 dark:text-red-100/90">
        {error.message || "Ocurrió un error al consultar los datos."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-900 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900/40"
        >
          Reintentar
        </button>
        <Link
          href="/admin/ventas"
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-800 hover:bg-red-100/60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/30"
        >
          Ir a ventas
        </Link>
      </div>
    </div>
  );
}
