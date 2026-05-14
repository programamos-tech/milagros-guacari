import Link from "next/link";
import { AnimatedInteger } from "@/components/admin/ReportsAnimatedFigures";

type VentasPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
};

/** Páginas a mostrar con elipsis (1 … 4 5 6 … 25). */
function visiblePageSlots(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const want = new Set<number>();
  want.add(1);
  want.add(totalPages);
  for (let p = current - 2; p <= current + 2; p++) {
    if (p >= 1 && p <= totalPages) want.add(p);
  }
  const sorted = [...want].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m14 7-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m10 7 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const stepBtn =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
const stepBtnDisabled = `${stepBtn} cursor-not-allowed opacity-25 hover:bg-transparent dark:hover:bg-transparent`;

const pageLink =
  "inline-flex min-h-8 min-w-8 items-center justify-center rounded-full px-2 text-[13px] font-medium tabular-nums text-zinc-600 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
const pageActive =
  "inline-flex min-h-8 min-w-8 cursor-default items-center justify-center rounded-full bg-rose-500/12 px-2 text-[13px] font-semibold tabular-nums text-rose-900 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.12)] dark:bg-rose-400/10 dark:text-rose-100 dark:shadow-[inset_0_0_0_1px_rgba(251,113,133,0.2)]";

export function VentasPagination({
  page,
  pageSize,
  total,
  buildHref,
}: VentasPaginationProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const slots = visiblePageSlots(page, totalPages);

  return (
    <div
      className="flex flex-col gap-3 border-t border-zinc-100/90 bg-zinc-50/40 px-4 py-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-5"
      style={{ ["--reports-stagger" as string]: "80ms" }}
    >
      <p className="text-[13px] tabular-nums tracking-tight text-zinc-500 dark:text-zinc-500">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          <AnimatedInteger value={from} duration={700} delay={90} className="tabular-nums" />
          <span className="mx-0.5 font-normal text-zinc-300 dark:text-zinc-600">–</span>
          <AnimatedInteger value={to} duration={700} delay={130} className="tabular-nums" />
        </span>
        <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
        <AnimatedInteger value={total} duration={800} delay={170} className="tabular-nums text-zinc-500 dark:text-zinc-500" />
      </p>

      <nav
        className="inline-flex max-w-full items-center gap-0.5 self-end rounded-full border border-zinc-200/70 bg-white/90 p-1 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-none sm:self-auto"
        aria-label={`Paginación, página ${page} de ${totalPages}`}
      >
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            scroll={false}
            className={stepBtn}
            aria-label="Página anterior"
            title="Anterior"
          >
            <IconChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={stepBtnDisabled} aria-disabled aria-label="Página anterior">
            <IconChevronLeft className="size-4" />
          </span>
        )}

        <ol className="flex max-w-[min(100vw-8rem,20rem)] items-center gap-0.5 overflow-x-auto px-0.5 [scrollbar-width:none] sm:max-w-none [&::-webkit-scrollbar]:hidden">
          {slots.map((slot, idx) =>
            slot === "gap" ? (
              <li key={`gap-${idx}`} className="flex shrink-0 px-1" aria-hidden>
                <span className="select-none text-[13px] font-medium text-zinc-300 dark:text-zinc-600">…</span>
              </li>
            ) : (
              <li key={slot} className="shrink-0">
                {slot === page ? (
                  <span className={pageActive} aria-current="page">
                    {slot}
                  </span>
                ) : (
                  <Link
                    href={buildHref(slot)}
                    scroll={false}
                    className={pageLink}
                    title={`Página ${slot}`}
                  >
                    {slot}
                  </Link>
                )}
              </li>
            ),
          )}
        </ol>

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            scroll={false}
            className={stepBtn}
            aria-label="Página siguiente"
            title="Siguiente"
          >
            <IconChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={stepBtnDisabled} aria-disabled aria-label="Página siguiente">
            <IconChevronRight className="size-4" />
          </span>
        )}
      </nav>
    </div>
  );
}
