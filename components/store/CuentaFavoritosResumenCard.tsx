"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useStoreFavorites } from "@/components/store/StoreFavoritesProvider";

const cardTitle =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900";
const cardBody =
  "mt-6 flex flex-1 flex-col items-center justify-center text-sm leading-relaxed text-stone-600";

type PreviewProduct = { id: string; name: string };

export function CuentaFavoritosResumenCard() {
  const { ids, ready, count } = useStoreFavorites();
  const [preview, setPreview] = useState<PreviewProduct[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    if (!ready || ids.length === 0) {
      setPreview([]);
      return;
    }
    const q = encodeURIComponent(ids.join(","));
    let cancelled = false;
    setLoadingNames(true);
    void fetch(`/api/products/favorites?ids=${q}`)
      .then((r) => r.json())
      .then((body: { products?: { id: string; name: string }[] }) => {
        if (cancelled) return;
        const list = (body.products ?? []).map((p) => ({ id: p.id, name: p.name }));
        setPreview(list);
      })
      .catch(() => {
        if (!cancelled) setPreview([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingNames(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, ids]);

  return (
    <article className="flex min-h-[15rem] flex-col border border-stone-200/90 bg-white p-6 sm:min-h-[16rem] sm:p-8">
      <h2 className={`${cardTitle} text-center`}>Mis favoritos</h2>
      <div className={`${cardBody} gap-4`}>
        {!ready ? (
          <p className="text-center text-sm text-stone-500">Cargando…</p>
        ) : count === 0 ? (
          <>
            <Heart className="size-8 text-stone-900" strokeWidth={1.25} aria-hidden />
            <p className="max-w-[14rem] text-center text-sm">
              Esta lista está vacía — guarda favoritos mientras compras.
            </p>
            <Link
              href="/favoritos"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-900 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-600"
            >
              Ver favoritos
            </Link>
          </>
        ) : (
          <>
            <Heart
              className="size-8 text-stone-900"
              strokeWidth={1.25}
              fill="currentColor"
              aria-hidden
            />
            <p className="max-w-[16rem] text-center text-sm font-medium text-stone-900">
              {count === 1 ? "Tenés 1 producto guardado." : `Tenés ${count} productos guardados.`}
            </p>
            {loadingNames && preview.length === 0 ? (
              <p className="text-center text-xs text-stone-500">Cargando nombres…</p>
            ) : preview.length > 0 ? (
              <ul className="w-full max-w-[18rem] space-y-2 text-center text-sm">
                {preview.slice(0, 3).map((p) => (
                  <li key={p.id} className="truncate">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-950"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {count > 3 ? (
              <p className="text-center text-xs text-stone-500">+{count - 3} más en tu lista</p>
            ) : null}
            {!loadingNames && preview.length > 0 && preview.length < count ? (
              <p className="max-w-[16rem] text-center text-xs text-stone-500">
                Parte de tus guardados ya no aparece en el catálogo público; seguís viéndolos en Favoritos.
              </p>
            ) : null}
            {!loadingNames && preview.length === 0 && count > 0 ? (
              <p className="max-w-[16rem] text-center text-xs text-stone-500">
                Esos productos no están publicados ahora; abrí Favoritos para revisar la lista completa.
              </p>
            ) : null}
            <Link
              href="/favoritos"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-900 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-600"
            >
              Ver favoritos
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
