"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { flashStorePageEnter } from "@/components/store/StorePageEnter";

export function StoreLogoLink({
  href = "/",
  brand,
  logoPath,
  className,
}: {
  href?: string;
  brand: string;
  logoPath: string;
  className?: string;
}) {
  const pathname = usePathname() || "/";

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (pathname === href || (href === "/" && pathname === "/")) {
          e.preventDefault();
          flashStorePageEnter();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      <Image
        src={logoPath}
        alt={brand}
        width={420}
        height={230}
        className="mx-auto h-11 w-full object-contain object-center sm:h-12 lg:h-[4.25rem]"
        priority
      />
    </Link>
  );
}
