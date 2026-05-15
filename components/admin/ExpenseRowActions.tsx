import Link from "next/link";
import { ExpenseCancelButton } from "@/components/admin/ExpenseCancelButton";

const iconBtnClass =
  "inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

type Props = {
  expenseId: string;
  conceptLabel: string;
  isCancelled: boolean;
  canCancel: boolean;
};

export function ExpenseRowActions({
  expenseId,
  conceptLabel,
  isCancelled,
  canCancel,
}: Props) {
  return (
    <div className="flex justify-end gap-0.5">
      <Link
        href={`/admin/egresos/${expenseId}`}
        className={iconBtnClass}
        title="Ver detalle"
        aria-label="Ver detalle del egreso"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Link>
      <ExpenseCancelButton
        expenseId={expenseId}
        conceptLabel={conceptLabel}
        isCancelled={isCancelled}
        canCancel={canCancel}
        variant="icon"
      />
    </div>
  );
}
