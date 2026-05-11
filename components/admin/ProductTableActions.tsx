"use client";

import Link from "next/link";

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5" aria-hidden>
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.5" />
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
  canEdit: boolean;
  canStock: boolean;
  canTransfer: boolean;
};

export function ProductTableActions({
  productId,
  canEdit,
  canStock,
  canTransfer,
}: Props) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5 sm:gap-1">
      <Link
        href={`/admin/products/${productId}`}
        className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        title="Ver detalle del producto"
      >
        <IconEye />
      </Link>
      {canEdit ? (
        <Link
          href={`/admin/products/${productId}/edit`}
          className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          title="Editar producto"
        >
          <IconPencil />
        </Link>
      ) : null}
      {canStock ? (
        <Link
          href={`/admin/products/${productId}/stock`}
          className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          title="Actualizar stock"
        >
          <IconBox />
        </Link>
      ) : null}
      {canTransfer ? (
        <Link
          href={`/admin/products/${productId}/transfer`}
          className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          title="Transferir stock"
        >
          <IconTransfer />
        </Link>
      ) : null}
    </div>
  );
}
