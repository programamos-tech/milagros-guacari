import Image from "next/image";
import Link from "next/link";
import {
  bereaSignaturePath,
  storeBrand,
  storeCopyrightHolder,
  storeInstagramUrl,
  storeLogoPath,
  storeSupportEmail,
  storeSupportHours,
  storeSupportPhone,
  storeWhatsAppUrl,
} from "@/lib/brand";

const footerColumnTitle =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90";

const footerLink =
  "block text-sm leading-relaxed text-white/85 transition hover:text-white hover:underline underline-offset-4";

const footerLinkMuted =
  "text-[11px] text-white/75 transition hover:text-white hover:underline underline-offset-4 sm:text-xs";

const telHref = `tel:${storeSupportPhone.replace(/[^\d+]/g, "")}`;

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/20 bg-[var(--store-header-bg)] text-[var(--store-header-fg)]">
      {/* 1 · Columnas de navegación */}
      <div>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:py-14">
          <div className="flex flex-col gap-10 lg:gap-12">
            <div className="flex justify-center px-2">
              <Link
                href="/"
                className="inline-block outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--store-header-bg)]"
              >
                <Image
                  src={storeLogoPath}
                  alt={storeBrand}
                  width={560}
                  height={308}
                  className="h-[4.5rem] w-auto max-w-[min(88vw,20rem)] object-contain object-center sm:h-20 sm:max-w-[min(85vw,24rem)] md:h-[5.25rem] lg:h-24 lg:max-w-[min(80vw,28rem)] xl:h-28 xl:max-w-[32rem]"
                />
              </Link>
            </div>
            <div className="min-w-0 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              <div>
                <p className={footerColumnTitle}>Ayuda</p>
                <ul className="mt-5 space-y-3">
                  <li>
                    <a href={telHref} className={footerLink}>
                      Llámanos · {storeSupportPhone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${storeSupportEmail}`}
                      className={footerLink}
                    >
                      {storeSupportEmail}
                    </a>
                  </li>
                  <li>
                    <a
                      href={storeWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={footerLink}
                    >
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <span className="text-sm leading-relaxed text-white/80">
                      {storeSupportHours}
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <p className={footerColumnTitle}>Tienda</p>
                <ul className="mt-5 space-y-3">
                  <li>
                    <Link href="/" className={footerLink}>
                      Inicio
                    </Link>
                  </li>
                  <li>
                    <Link href="/products" className={footerLink}>
                      Productos
                    </Link>
                  </li>
                  <li>
                    <Link href="/checkout" className={footerLink}>
                      Bolsa
                    </Link>
                  </li>
                  <li>
                    <Link href="/favoritos" className={footerLink}>
                      Favoritos
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className={footerColumnTitle}>Sobre nosotros</p>
                <ul className="mt-5 space-y-3">
                  <li>
                    <Link href="/quien-soy" className={footerLink}>
                      Quién soy
                    </Link>
                  </li>
                  <li>
                    <Link href="/products" className={footerLink}>
                      Catálogo completo
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className={footerColumnTitle}>Síguenos</p>
                <ul className="mt-5 space-y-3">
                  <li>
                    <a
                      href={storeInstagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={footerLink}
                    >
                      Instagram
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Legal */}
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-[11px] text-white/70 sm:text-xs">
            © {year} {storeCopyrightHolder}. Todos los derechos reservados.
          </p>
          <div className="flex w-full flex-col items-end gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-8">
            <nav
              aria-label="Legal y equipo"
              className="flex flex-wrap justify-end gap-x-6 gap-y-2 text-[11px] sm:text-xs"
            >
              <Link href="/privacidad" className={footerLinkMuted}>
                Privacidad
              </Link>
              <Link href="/terminos" className={footerLinkMuted}>
                Términos de uso
              </Link>
              <Link href="/cookies" className={footerLinkMuted}>
                Cookies
              </Link>
              <Link
                href="/admin"
                className={`${footerLinkMuted} font-semibold text-white/90`}
              >
                Backoffice
              </Link>
            </nav>
            <div className="group shrink-0 sm:pl-1">
              <Image
                src={bereaSignaturePath}
                alt="Berea — diseño y desarrollo de software a la medida"
                width={320}
                height={82}
                className="h-10 w-auto max-w-[15rem] origin-right object-contain object-right opacity-[0.88] transition-[opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:[filter:brightness(1.06)_contrast(1.03)_drop-shadow(0_12px_28px_rgba(0,0,0,0.18))] sm:h-12 sm:max-w-[18rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
