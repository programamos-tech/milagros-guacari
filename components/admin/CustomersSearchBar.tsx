"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function buildCustomersQuery(
  pathname: string,
  next: { q?: string },
  current: URLSearchParams,
) {
  const p = new URLSearchParams(current.toString());
  if (next.q !== undefined) {
    if (next.q.trim()) p.set("q", next.q.trim());
    else p.delete("q");
    p.delete("page");
  }
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

type CustomersSearchBarProps = {
  initialQ: string;
  filterLabelClass: string;
  inputClassName: string;
};

export function CustomersSearchBar({
  initialQ,
  filterLabelClass,
  inputClassName,
}: CustomersSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const pushQuery = useCallback(
    (patch: { q?: string }) => {
      const url = buildCustomersQuery(pathname, patch, searchParams);
      router.replace(url);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const urlQ = searchParams.get("q") ?? "";
      if (q.trim() === urlQ.trim()) return;
      pushQuery({ q });
    }, 380);
    return () => clearTimeout(t);
  }, [q, pushQuery, searchParams]);

  return (
    <div className="grid gap-4 sm:grid-cols-12">
      <div className="sm:col-span-12 lg:col-span-8">
        <label htmlFor="customer-q" className={filterLabelClass}>
          Buscar
        </label>
        <input
          id="customer-q"
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, email, documento, teléfono o dirección…"
          className={inputClassName}
          autoComplete="off"
          aria-label="Buscar clientes"
        />
      </div>
    </div>
  );
}
