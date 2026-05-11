import Link from "next/link";
import type { AdminActivityAction, AdminActivityLogRow } from "@/lib/admin-activity-log";
import { actionTypeLabel } from "@/lib/admin-activity-log";
import { getActivityDetailRows } from "@/lib/activity-log-details";

function IconUser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPackage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z" strokeLinejoin="round" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" strokeLinejoin="round" />
    </svg>
  );
}

function IconStockAdjust({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M4 19V5M4 19H20M4 19 8 15M8 9V5M16 9V5M12 5v14M16 9l4 4M8 9 4 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTransfer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M7 7h13l-3-3M17 17H4l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 4v6M18 14v6" strokeLinecap="round" />
    </svg>
  );
}

function IconSale({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M6 3h12l-1 14H7L6 3Z" strokeLinejoin="round" />
      <path d="M9 21h6M10 17h4" strokeLinecap="round" />
    </svg>
  );
}

function IconCancel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  );
}

function actionIcon(action: AdminActivityAction): typeof IconUser {
  switch (action) {
    case "customer_created":
    case "customer_updated":
      return IconUser;
    case "product_created":
    case "product_updated":
      return IconPackage;
    case "stock_adjusted":
      return IconStockAdjust;
    case "stock_transferred":
      return IconTransfer;
    case "sale_created":
      return IconSale;
    case "sale_cancelled":
      return IconCancel;
    default:
      return IconPackage;
  }
}

function entityLink(row: AdminActivityLogRow): { href: string; label: string } | null {
  if (!row.entity_id) return null;
  const id = row.entity_id;
  switch (row.entity_type) {
    case "customer":
      return { href: `/admin/customers/${id}`, label: "Cliente" };
    case "product":
      return { href: `/admin/products/${id}/edit`, label: "Producto" };
    case "order":
      return { href: `/admin/orders/${id}`, label: "Factura" };
    default:
      return null;
  }
}

type Props = {
  row: AdminActivityLogRow;
  actorDisplay: string;
  formatWhen: (iso: string) => string;
};

export function ActivityLogCard({ row, actorDisplay, formatWhen }: Props) {
  const link = entityLink(row);
  const details = getActivityDetailRows(row.action_type, row.metadata);
  const Icon = actionIcon(row.action_type);
  const shortId = row.entity_id ? row.entity_id.slice(0, 8) : null;

  return (
    <li className="rounded-xl border border-zinc-200/90 bg-white px-2.5 py-2 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06] sm:px-3 sm:py-2.5">
      <div className="flex gap-2.5 sm:gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {actionTypeLabel(row.action_type)}
            </p>
            <time
              dateTime={row.created_at}
              className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500"
            >
              {formatWhen(row.created_at)}
            </time>
          </div>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
            {row.summary}
          </p>

          {details.length > 0 ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              {details.map((d, i) => (
                <span key={`${row.id}-d-${i}`}>
                  {i > 0 ? <span className="text-zinc-300 dark:text-zinc-600"> · </span> : null}
                  <span className="text-zinc-500 dark:text-zinc-400">{d.label}:</span> {d.value}
                </span>
              ))}
            </p>
          ) : null}

          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">{actorDisplay}</span>
            {shortId ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span
                  className="font-mono text-zinc-500 dark:text-zinc-400"
                  title={row.entity_id ?? undefined}
                >
                  {shortId}
                </span>
              </>
            ) : null}
            {link ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <Link
                  href={link.href}
                  className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                >
                  {link.label}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
}
