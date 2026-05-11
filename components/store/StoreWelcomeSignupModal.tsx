"use client";

import Image from "next/image";
import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";

const DISMISS_KEY = "tiendas_welcome_signup_modal_dismissed_v1";

export function StoreWelcomeSignupModal({
  title,
  description,
  imagePath,
  discountCode,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  imagePath?: string | null;
  discountCode?: string | null;
  ctaLabel: string;
  ctaHref?: string | null;
}) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    setOpen(!dismissed);
    setReady(true);
  }, []);

  const close = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };
  const copyCode = async () => {
    if (!discountCode) return;
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const img = storagePublicObjectUrl(imagePath);

  if (!ready || !open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg overflow-hidden bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)]">
        {img ? (
          <div className="relative aspect-[4/3] max-h-[66vh] w-full overflow-hidden bg-stone-100">
            <Image
              src={img}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 560px"
              unoptimized={shouldUnoptimizeStorageImageUrl(img)}
            />
          </div>
        ) : null}
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur hover:bg-black/40"
          aria-label="Cerrar modal de bienvenida"
        >
          <X className="size-4" />
        </button>
        <div className="space-y-3 px-6 pb-8 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8c7a]">
            Bienvenida
          </p>
          <h3 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.01em] text-stone-900">
            {title}
          </h3>
          {description ? (
            <p className="text-[13px] leading-relaxed text-stone-500">{description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {discountCode ? (
              <>
                <span className="inline-flex rounded-full bg-[#f4efe4] px-3 py-1 text-[13px] font-semibold text-[#617260]">
                  Código: {discountCode}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                >
                  <Copy className="size-3.5" />
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </>
            ) : null}
            {ctaHref ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-[#6b7f6a] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#5c6e5b]"
              >
                {ctaLabel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

