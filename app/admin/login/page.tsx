import Image from "next/image";
import Link from "next/link";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";
import { AdminLoginForm } from "@/components/admin/LoginForm";
import { bereaSignaturePath, storeBrand, storeLogoPath } from "@/lib/brand";

const serif = "[font-family:ui-serif,Georgia,Cambria,'Times_New_Roman',serif]";

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-screen bg-white text-neutral-950 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <div className="pointer-events-none absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <div className="pointer-events-auto rounded-lg border border-neutral-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
          <AdminThemeToggle className="rounded-lg" />
        </div>
      </div>
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Panel editorial — marca */}
        <aside className="relative flex flex-col justify-center border-b border-neutral-200 px-8 py-14 sm:px-12 dark:border-zinc-800 dark:bg-zinc-900/40 lg:w-[44%] lg:max-w-xl lg:border-b-0 lg:border-r lg:py-20 lg:pl-14 lg:pr-10 xl:pl-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(0,0,0,0.03),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(255,255,255,0.04),transparent_55%)]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-sm lg:mx-0">
            <Link
              href="/"
              className="group inline-block outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-4 dark:focus-visible:ring-zinc-300 dark:focus-visible:ring-offset-zinc-950"
            >
              <Image
                src={storeLogoPath}
                alt={storeBrand}
                width={320}
                height={140}
                className="h-auto w-full max-w-[260px] object-contain object-left transition-opacity duration-500 group-hover:opacity-85 sm:max-w-[280px]"
                priority
              />
            </Link>
            <p className="mt-10 text-[10px] font-semibold uppercase tracking-[0.42em] text-neutral-400 dark:text-zinc-500">
              Backoffice
            </p>
            <p
              className={`mt-5 max-w-[19rem] text-[17px] leading-[1.55] text-neutral-600 dark:text-zinc-400 ${serif}`}
            >
              Gestioná inventario, ventas y clientes desde un solo lugar.
            </p>
            <div className="mt-12 flex items-center gap-3" aria-hidden>
              <span className="h-px w-10 bg-neutral-950 dark:bg-zinc-100" />
              <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-neutral-300 dark:text-zinc-600">
                MP
              </span>
            </div>
          </div>
        </aside>

        {/* Formulario */}
        <main className="relative flex flex-1 flex-col justify-center bg-neutral-50/40 px-6 py-14 sm:px-10 dark:bg-zinc-950 lg:px-16 xl:px-24">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,250,250,0.65)_100%)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.92)_0%,rgba(9,9,11,0.85)_100%)]" />
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="border border-neutral-200/90 bg-white px-8 py-10 shadow-[0_32px_90px_-40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.8)_inset] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_32px_90px_-40px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:px-10 sm:py-12">
              <h1 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-neutral-950 dark:text-zinc-100">
                Iniciar sesión
              </h1>
              <p
                className={`mt-5 text-[15px] leading-relaxed text-neutral-500 dark:text-zinc-400 ${serif}`}
              >
                Entra con tu cuenta para continuar al panel.
              </p>

              <div className="mt-10">
                <AdminLoginForm />
              </div>

              <p className="mt-10 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-neutral-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <span aria-hidden className="text-lg leading-none">
                    ←
                  </span>
                  Volver a la tienda
                </Link>
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 border-t border-neutral-200/80 pt-8 dark:border-zinc-700">
              <p className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400 dark:text-zinc-500">
                Solo personal autorizado
              </p>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-neutral-300 dark:text-zinc-600">
                  Experiencia por
                </span>
                <Image
                  src={bereaSignaturePath}
                  alt="Berea — diseño y desarrollo de software a la medida"
                  width={320}
                  height={82}
                  className="h-12 w-auto max-w-[min(100%,15rem)] object-contain opacity-[0.88] sm:h-14"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
