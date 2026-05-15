"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCop } from "@/lib/money";
import { storefrontListGrossUnitCents } from "@/lib/storefront-gross-price";
import { pseudoReviewCount } from "@/lib/pseudo-review";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";
import {
  STORE_HEADER_ICON_SM,
  STORE_HEADER_ICON_STROKE,
} from "@/lib/store-header-icons";

type ProductRow = {
  id: string;
  name: string;
  price_cents: number;
  has_vat?: boolean | null;
  image_path: string | null;
};

function SearchResultsPanel({
  debounced,
  loading,
  products,
  onPick,
  panelClassName,
}: {
  debounced: string;
  loading: boolean;
  products: ProductRow[];
  onPick: () => void;
  panelClassName: string;
}) {
  return (
    <div
      id="store-search-results"
      role="listbox"
      aria-label="Resultados de búsqueda"
      className={panelClassName}
    >
      {loading ? (
        <div className="space-y-0 p-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex animate-pulse gap-3 border-b border-stone-100 p-3 last:border-b-0"
            >
              <div className="size-12 shrink-0 rounded-lg bg-stone-100" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-full max-w-[12rem] rounded bg-stone-100" />
                <div className="h-2 w-full max-w-[6rem] rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="p-4 text-center text-sm text-stone-500">
          No hay productos que coincidan con “{debounced}”.
        </p>
      ) : (
        <ul className="py-1">
          {products.map((p, idx) => {
            const img = storagePublicObjectUrl(p.image_path);
            const reviews = pseudoReviewCount(p.id);
            return (
              <li
                key={p.id}
                className={idx < products.length - 1 ? "border-b border-stone-100" : ""}
              >
                <Link
                  href={`/products/${p.id}`}
                  onClick={onPick}
                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[#fff4f8]"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200/80">
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-stone-400">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--store-brand)]">{p.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className="text-[11px] leading-none tracking-tight text-amber-500"
                        aria-hidden
                      >
                        ★★★★★
                      </span>
                      <span className="text-[11px] text-stone-400">({reviews})</span>
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-stone-900">
                    {formatCop(
                      storefrontListGrossUnitCents(
                        p.price_cents,
                        p.has_vat,
                      ),
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function StoreSearch({
  variant = "default",
}: {
  variant?: "default" | "minimal";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(debounced)}`,
        );
        const data = (await res.json()) as { products?: ProductRow[] };
        if (!cancelled) {
          setProducts(data.products ?? []);
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    close();
    if (q) router.push(`/products?q=${encodeURIComponent(q)}`);
    else router.push("/products");
  }

  function onQueryChange(v: string) {
    setQuery(v);
    const t = v.trim();
    if (t.length < 2) {
      setProducts([]);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }

  const showPanel = open && debounced.length >= 2;

  const panelBase =
    "absolute left-0 top-full z-50 mt-2 max-h-[min(70vh,22rem)] min-w-0 overflow-y-auto rounded-xl border border-stone-200/90 bg-white shadow-xl shadow-stone-200/90 ring-1 ring-stone-100";

  const resultsPanel = showPanel ? (
    <SearchResultsPanel
      debounced={debounced}
      loading={loading}
      products={products}
      onPick={close}
      panelClassName={
        variant === "minimal"
          ? `${panelBase} right-0 w-[min(100vw-2rem,22rem)]`
          : `${panelBase} right-0 w-full`
      }
    />
  ) : null;

  if (variant === "minimal") {
    return (
      <div
        ref={wrapRef}
        className="relative hidden min-w-0 sm:block sm:max-w-[11rem] md:max-w-[14rem] lg:max-w-[16rem]"
      >
        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 border-b border-white/45 pb-1 text-white/90 transition-colors focus-within:border-white"
        >
          <Search
            className={`mb-0.5 ${STORE_HEADER_ICON_SM}`}
            strokeWidth={STORE_HEADER_ICON_STROKE}
            aria-hidden
          />
          <input
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Buscar"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (debounced.length >= 2) setOpen(true);
            }}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/50 focus:outline-none"
            aria-controls="store-search-results"
            aria-autocomplete="list"
            aria-haspopup="listbox"
          />
        </form>
        {resultsPanel}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative min-w-0 w-full max-w-none flex-1 lg:min-w-[12rem]">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-full border border-stone-200 bg-[#fff9fb] py-2 pl-4 pr-3 shadow-sm"
      >
        <input
          name="q"
          type="search"
          autoComplete="off"
          placeholder="Buscar producto"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {
            if (debounced.length >= 2) setOpen(true);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          aria-controls="store-search-results"
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center rounded-full p-1 text-stone-500 transition hover:bg-white/80 hover:text-stone-700"
          aria-label="Buscar"
        >
          <Search className="size-5" strokeWidth={STORE_HEADER_ICON_STROKE} aria-hidden />
        </button>
      </form>
      {resultsPanel}
    </div>
  );
}
