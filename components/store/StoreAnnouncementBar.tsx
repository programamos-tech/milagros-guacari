import {
  storeAnnouncementMessage,
  storeSupportPhone,
  storeWhatsAppUrl,
} from "@/lib/brand";

/** Número de copias del bloque (mismo texto). Debe coincidir con el % en `store-announcement-marquee` (-100%/N). */
const MARQUEE_SEGMENT_COUNT = 12;

const phoneLinkClass =
  "whitespace-nowrap font-normal text-[#b8325e] underline decoration-[#FF76A1]/35 underline-offset-[3px] hover:text-[#9d1f4d]";

function AnnouncementSegment({ isDuplicate }: { isDuplicate: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-x-2 whitespace-nowrap py-2.5 pr-3 text-[11px] font-medium uppercase leading-snug tracking-[0.14em] text-stone-700 sm:gap-x-2.5 sm:pr-4 sm:text-xs sm:tracking-[0.16em] ${
        isDuplicate ? "store-announcement-marquee-segment--dupe" : ""
      }`}
      aria-hidden={isDuplicate ? true : undefined}
    >
      <span className="font-normal">{storeAnnouncementMessage}</span>
      <span className="text-stone-400" aria-hidden>
        ·
      </span>
      <a
        href={storeWhatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={phoneLinkClass}
      >
        {storeSupportPhone}
      </a>
    </span>
  );
}

export function StoreAnnouncementBar() {
  return (
    <div
      className="border-b border-[#ffd6e8]/80 bg-[var(--store-announcement-bg)] text-stone-700"
      role="region"
      aria-label="Anuncio de la tienda"
    >
      <div className="relative w-full min-w-0 overflow-hidden px-2 sm:px-3">
        <div className="store-announcement-marquee-track">
          {Array.from({ length: MARQUEE_SEGMENT_COUNT }, (_, i) => (
            <AnnouncementSegment key={i} isDuplicate={i > 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
