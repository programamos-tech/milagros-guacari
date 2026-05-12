"use client";

import { deleteCustomerById } from "@/app/actions/admin/store-customers";
import { adminButtonCancelClass } from "@/lib/admin-ui";
import { type ReactNode, useRef, useTransition } from "react";

function IconTrash() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="size-5"
      aria-hidden
    >
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

const dialogClass =
  "fixed left-1/2 top-1/2 z-[200] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl max-h-[min(90dvh,100%)] overflow-y-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::backdrop]:bg-zinc-950/50";

type Props = {
  customerId: string;
  customerName: string;
  className?: string;
  children?: ReactNode;
  variant?: "block" | "toolbar";
};

export function CustomerDeleteConfirmForm({
  customerId,
  customerName,
  className,
  children,
  variant = "block",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const openDialog = () => {
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    if (!pending) dialogRef.current?.close();
  };

  const confirmDelete = () => {
    startTransition(() => {
      void deleteCustomerById(customerId);
    });
  };

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-labelledby="customer-delete-dialog-title"
      className={dialogClass}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
    >
      <h2 id="customer-delete-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        ¿Eliminar este cliente?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        Se va a borrar{" "}
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">«{customerName}»</span>.
        Esta acción no se puede deshacer.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          className={adminButtonCancelClass}
          onClick={closeDialog}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          onClick={confirmDelete}
        >
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </dialog>
  );

  if (variant === "toolbar") {
    return (
      <>
        <button
          type="button"
          title="Eliminar cliente"
          aria-label="Eliminar cliente"
          className="inline-flex size-10 items-center justify-center rounded-full border-2 border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-400 dark:shadow-none dark:hover:bg-red-950/45"
          onClick={openDialog}
        >
          <IconTrash />
        </button>
        {dialog}
      </>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        className="rounded-lg border-2 border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800/55 dark:bg-zinc-900 dark:text-red-400 dark:shadow-none dark:hover:bg-red-950/25"
        onClick={openDialog}
      >
        {children ?? "Eliminar"}
      </button>
      {dialog}
    </div>
  );
}
