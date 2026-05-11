"use client";

import Link from "next/link";
import { CustomerDeleteConfirmForm } from "@/components/admin/CustomerDeleteConfirmForm";

function IconBack() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="size-5"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Props = {
  customerId: string;
  customerName: string;
};

/** Barra del card de título: volver + Editar (texto) + Eliminar (texto), como el mockup de cliente. */
export function CustomerDetailHeaderActions({ customerId, customerName }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/admin/customers"
        className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Volver"
        aria-label="Volver al listado de clientes"
      >
        <IconBack />
      </Link>
      <Link
        href={`/admin/customers/${customerId}/edit`}
        className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
      >
        Editar
      </Link>
      <CustomerDeleteConfirmForm
        customerId={customerId}
        customerName={customerName}
        variant="block"
        className="inline-flex shrink-0"
      />
    </div>
  );
}
