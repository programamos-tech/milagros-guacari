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
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
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
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
