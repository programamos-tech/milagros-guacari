import Link from "next/link";
import { storeBrand, storeTagline } from "@/lib/brand";

export const metadata = {
  title: `Quién Soy | ${storeBrand}`,
};

export default function QuienSoyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
        Quién Soy
      </h1>
      <p className="mt-2 text-sm font-medium text-stone-600">{storeTagline}</p>
      <p className="mt-6 text-sm leading-relaxed text-stone-600 sm:text-base">
        Detrás de {storeBrand} hay un equipo que cuida cada detalle: productos
        seleccionados, asesoría cercana y envíos coordinados para que compres con
        confianza.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">
        Trabajamos con productos originales y envíos a toda Colombia, con la misma
        cercanía que en redes: asesoría clara, entregas coordinadas y catálogo
        actualizado.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">
        Si tienes dudas sobre tallas, marcas o tiempos de envío, escríbeme: estoy para
        ayudarte a comprar con confianza.
      </p>
      <Link
        href="/products"
        className="mt-8 inline-flex rounded-xl bg-[#6b7f6a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a6d59]"
      >
        Ver productos
      </Link>
    </div>
  );
}
