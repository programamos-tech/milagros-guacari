"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  saved: boolean;
  uploadError: boolean;
  /** Same URL sin `saved` ni `uploadError`, para limpiar la barra de direcciones */
  cleanHref: string;
};

export function AdminProductsFlashToast({
  saved,
  uploadError,
  cleanHref,
}: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(saved || uploadError);
  const replaced = useRef(false);

  useEffect(() => {
    if ((!saved && !uploadError) || replaced.current) return;
    replaced.current = true;
    router.replace(cleanHref, { scroll: false });
  }, [saved, uploadError, cleanHref, router]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!(saved || uploadError) || !visible) return null;

  if (uploadError) {
    return (
      <div
        role="status"
        className="fixed bottom-5 right-5 z-[100] max-w-[min(20rem,calc(100vw-2.5rem))] rounded-lg border border-amber-200/90 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-950 shadow-lg shadow-zinc-900/10"
      >
        Guardado · la imagen no se subió. Edita el producto y vuelve a intentar.
      </div>
    );
  }

  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-[100] rounded-lg border border-emerald-200/90 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 shadow-lg shadow-zinc-900/10"
    >
      ¡Guardado!
    </div>
  );
}
