"use client";

import Link from "next/link";
import { ExpenseCancelButton } from "@/components/admin/ExpenseCancelButton";

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
  expenseId: string;
  conceptLabel: string;
  isCancelled: boolean;
  canCancel: boolean;
};

export function ExpenseDetailHeaderActions({
  expenseId,
  conceptLabel,
  isCancelled,
  canCancel,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExpenseCancelButton
        expenseId={expenseId}
        conceptLabel={conceptLabel}
        isCancelled={isCancelled}
        canCancel={canCancel}
        variant="button"
      />
      <Link
        href="/admin/egresos"
        className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Volver"
        aria-label="Volver al listado de egresos"
      >
        <IconBack />
      </Link>
    </div>
  );
}
