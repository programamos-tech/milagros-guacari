import type { ReactNode } from "react";

export function LegalDocument({
  title,
  updatedLabel,
  children,
}: {
  title: string;
  updatedLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold uppercase tracking-[0.06em] text-[var(--store-brand)] sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-xs text-stone-500">{updatedLabel}</p>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-stone-700 sm:text-[15px]">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
