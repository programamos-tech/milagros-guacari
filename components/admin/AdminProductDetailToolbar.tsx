"use client";

import Link from "next/link";
import { ProductDeleteConfirmForm } from "@/components/admin/ProductDeleteConfirmForm";

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5" aria-hidden>
      <path d="M15 18 9 12l6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5 shrink-0" aria-hidden>
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" strokeLinejoin="round" />
      <path d="M3.3 7L12 12l8.7-5M12 22V12" strokeLinejoin="round" />
    </svg>
  );
}

function IconTransfer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5" aria-hidden>
      <path d="M7 16V4M7 4 3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Props = {
  productId: string;
  productName: string;
};

export function AdminProductDetailToolbar({
  productId,
  productName,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href="/admin/products"
        className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Volver al inventario"
      >
        <IconBack />
      </Link>
      <Link
        href={`/admin/products/${productId}/edit`}
        className="inline-flex size-10 items-center justify-center rounded-full border border-rose-950 bg-rose-950 text-white transition hover:bg-rose-900 hover:border-rose-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        title="Editar producto"
      >
        <IconPencil />
      </Link>
      <Link
        href={`/admin/products/${productId}/stock`}
        className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Actualizar stock"
      >
        <IconBox />
      </Link>
      <Link
        href={`/admin/products/${productId}/transfer`}
        className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Transferir stock"
      >
        <IconTransfer />
      </Link>
      <ProductDeleteConfirmForm
        productId={productId}
        productName={productName}
        variant="toolbar"
      />
    </div>
  );
}
