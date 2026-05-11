import type { SVGProps } from "react";
import Link from "next/link";
import { storeBrand } from "@/lib/brand";

function IconCartLeaf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <path
        d="M9 10h18l-2 12H11L9 10Zm0 0L8 6H4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="24" r="1.25" fill="currentColor" />
      <circle cx="22" cy="24" r="1.25" fill="currentColor" />
      <path
        d="M22 4c-2.5 2-4 4.5-4 7h6l1-3c-1-2-2-3.5-3-4Z"
        fill="currentColor"
        opacity={0.35}
      />
    </svg>
  );
}

type Props = {
  href?: string;
  /** default: ícono 11 / texto lg; compact: ícono 9 / texto sm (sidebar); admin-sidebar: sidebar oscuro */
  variant?: "default" | "compact" | "admin-sidebar";
  className?: string;
};

export function StoreBrandMark({
  href = "/",
  variant = "default",
  className = "",
}: Props) {
  const iconWrap =
    variant === "admin-sidebar"
      ? "size-9 rounded-lg"
      : variant === "compact"
        ? "size-9 rounded-lg"
        : "size-11 rounded-xl";
  const iconSize =
    variant === "admin-sidebar" || variant === "compact" ? "size-5" : "size-6";
  const textClass =
    variant === "admin-sidebar"
      ? "text-sm font-semibold leading-tight tracking-tight text-white"
      : variant === "compact"
        ? "text-sm font-semibold leading-tight text-stone-900"
        : "text-lg font-semibold leading-tight tracking-tight text-stone-900";
  const iconBoxClass =
    variant === "admin-sidebar"
      ? "bg-white/10 text-white ring-1 ring-white/15"
      : "bg-[#3d5240] text-white shadow-sm";
  const focusClass =
    variant === "admin-sidebar"
      ? "focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      : "focus-visible:ring-2 focus-visible:ring-[#6b7f6a] focus-visible:ring-offset-2";

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 rounded-lg outline-none ${focusClass} ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center ${iconBoxClass} ${iconWrap}`}
      >
        <IconCartLeaf className={iconSize} />
      </span>
      <span className={`min-w-0 text-left ${textClass}`}>{storeBrand}</span>
    </Link>
  );
}
