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
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900";

const footerLink =
  "block text-sm leading-relaxed text-stone-700 transition hover:text-stone-900 hover:underline underline-offset-4";

const telHref = `tel:${storeSupportPhone.replace(/[^\d+]/g, "")}`;

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200/90">
      {/* 1 · Columnas de navegación */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:py-14">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
            <div className="shrink-0 lg:max-w-[13rem] lg:pt-0.5">
              <Link
                href="/"
                className="inline-block outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-stone-400/40 focus-visible:ring-offset-2"
              >
                <Image
                  src={storeLogoPath}
                  alt={storeBrand}
                  width={400}
                  height={220}
                  className="h-11 w-auto object-contain object-left sm:h-12 lg:h-[3.35rem]"
                />
              </Link>
            </div>
            <div className="min-w-0 flex-1 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
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
                    <span className="text-sm leading-relaxed text-stone-600">
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
      <div className="border-t border-stone-200/90 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-[11px] text-stone-500 sm:text-xs">
            © {year} {storeCopyrightHolder}. Todos los derechos reservados.
          </p>
          <div className="flex w-full flex-col items-end gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-8">
            <nav
              aria-label="Legal y equipo"
              className="flex flex-wrap justify-end gap-x-6 gap-y-2 text-[11px] text-stone-500 sm:text-xs"
            >
              <Link href="/privacidad" className={`${footerLink} text-stone-500`}>
                Privacidad
              </Link>
              <Link href="/terminos" className={`${footerLink} text-stone-500`}>
                Términos de uso
              </Link>
              <Link href="/cookies" className={`${footerLink} text-stone-500`}>
                Cookies
              </Link>
              <Link href="/admin" className={`${footerLink} font-medium text-stone-600`}>
                Backoffice
              </Link>
            </nav>
            <div className="group shrink-0 sm:pl-1">
              <Image
                src={bereaSignaturePath}
                alt="Berea — diseño y desarrollo de software a la medida"
                width={320}
                height={82}
                className="h-10 w-auto max-w-[15rem] origin-right object-contain object-right opacity-[0.82] transition-[opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:[filter:brightness(1.06)_contrast(1.03)_drop-shadow(0_12px_28px_rgba(61,82,64,0.14))] sm:h-12 sm:max-w-[18rem]"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
