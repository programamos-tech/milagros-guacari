"use client";

import {
  storeSupportPhone,
  storeWhatsAppPrefilledText,
  storeWhatsAppUrl,
} from "@/lib/brand";
import { useStoreCartDrawer } from "@/components/store/StoreCartDrawerProvider";

/** Glifo oficial simplificado (sin trazo que genere línea negra al antialias). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.89.49 3.73 1.42 5.35L2 22l4.89-1.28a9.86 9.86 0 0 0 5.15 1.41h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.79 14.12c-.24.68-1.41 1.25-1.95 1.33-.5.08-1.13.11-1.82-.11-.42-.14-.96-.32-1.65-.63-2.9-1.26-4.79-4.19-4.93-4.38-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-.25c.09.17.2.36.3.55.1.19.14.32.22.53.08.21.04.39-.02.55-.07.17-.13.27-.26.42l-.38.44c-.13.14-.26.29-.11.57.14.28.66 1.09 1.42 1.76 1.01.89 1.82 1.17 2.08 1.3.26.13.41.11.56-.07.15-.17.65-.76.83-1.02.17-.26.35-.22.59-.13.24.09 1.52.72 1.78.85.26.13.44.2.5.31.07.11.07.64-.17 1.32z" />
    </svg>
  );
}

export function StoreWhatsAppFloatingButton() {
  const { isOpen: cartOpen } = useStoreCartDrawer();
  const href =
    storeWhatsAppUrl === "#"
      ? null
      : `${storeWhatsAppUrl}?text=${encodeURIComponent(storeWhatsAppPrefilledText)}`;

  if (!href || cartOpen) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[72] flex size-14 items-center justify-center overflow-hidden rounded-full bg-[#25D366] text-white shadow-[0_14px_36px_-10px_rgba(37,211,102,0.55),0_4px_12px_-4px_rgba(0,0,0,0.12)] transition hover:bg-[#20BD5A] hover:shadow-[0_18px_40px_-10px_rgba(37,211,102,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25D366] active:scale-[0.97] sm:right-6 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:size-[3.25rem]"
      aria-label={`Escribir por WhatsApp a ${storeSupportPhone}`}
    >
      <WhatsAppGlyph className="size-7 text-white sm:size-[1.45rem]" />
    </a>
  );
}
