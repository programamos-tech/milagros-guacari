"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  closeHref: string;
  children: React.ReactNode;
};

export function CategoriesModal({ closeHref, children }: Props) {
  const router = useRouter();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [closeHref, router]);

  return (
    <div
      className="fixed inset-0 z-50 flex max-lg:justify-end lg:items-center lg:justify-center lg:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="categories-modal-title"
    >
      <Link
        href={closeHref}
        className="absolute inset-0 z-0 bg-black/40 backdrop-blur-[1px] lg:bg-zinc-950/50 lg:backdrop-blur-[2px]"
        aria-label="Cerrar categorías"
        scroll={false}
      />
      <div
        className={[
          "relative z-10 flex w-full flex-col overflow-hidden bg-white shadow-xl ring-1 ring-zinc-950/5",
          "max-lg:h-full max-lg:w-[min(100%,26rem)] max-lg:border-l max-lg:border-zinc-200/90 max-lg:shadow-[-12px_0_48px_rgba(15,23,42,0.12)]",
          "lg:max-h-[min(90vh,720px)] lg:max-w-xl lg:rounded-2xl lg:border lg:border-zinc-200/90",
        ].join(" ")}
      >
        <Link
          href={closeHref}
          scroll={false}
          className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 max-lg:right-4 max-lg:top-4"
          aria-label="Cerrar"
        >
          <span className="sr-only">Cerrar</span>
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Link>
        <div className="store-cart-drawer-body-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6 lg:px-6 lg:pb-6 lg:pt-7">
          {children}
        </div>
      </div>
    </div>
  );
}
