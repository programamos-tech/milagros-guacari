import Link from "next/link";
import {
  storeBrand,
  storeCopyrightHolder,
  storeSupportEmail,
  storeSupportPhone,
} from "@/lib/brand";
import {
  LegalDocument,
  LegalSection,
} from "@/components/store/legal-document";

export const metadata = {
  title: `Términos de uso | ${storeBrand}`,
  description: `Condiciones generales de uso de ${storeBrand}.`,
};

export default function TerminosPage() {
  const updatedLabel = "Última actualización: 8 de mayo de 2026";

  return (
    <LegalDocument title="Términos de uso" updatedLabel={updatedLabel}>
      <p>
        Al acceder y usar el sitio web de <strong>{storeBrand}</strong> operado
        por <strong>{storeCopyrightHolder}</strong>, aceptás estos términos. Si
        no estás de acuerdo, te pedimos no utilizar la tienda.
      </p>

      <LegalSection title="El servicio">
        <p>
          Ofrecemos una plataforma para conocer productos, armar tu bolsa y, cuando
          corresponda, concretar compras según disponibilidad y políticas de envío
          comunicadas en el proceso de compra o por nuestros canales de atención.
        </p>
      </LegalSection>

      <LegalSection title="Cuenta y datos">
        <p>
          Sos responsable de la veracidad de los datos que cargás y de mantener
          la confidencialidad de tu cuenta cuando exista. Podemos suspender el
          acceso ante uso indebido, fraude o incumplimiento de estos términos.
        </p>
      </LegalSection>

      <LegalSection title="Productos y precios">
        <p>
          Las descripciones, imágenes y precios buscan ser precisos; pueden
          existir errores involuntarios o cambios de stock. Nos reservamos el
          derecho de corregir información o cancelar un pedido antes del envío si
          no podemos cumplirlo, reintegrando lo pagado según el medio utilizado.
        </p>
      </LegalSection>

      <LegalSection title="Pedidos y pago">
        <p>
          La compra se entiende celebrada cuando confirmás el pedido y el pago es
          aprobado por la pasarela correspondiente. Recibirás comunicaciones sobre
          el estado del pedido por los medios que hayas proporcionado.
        </p>
      </LegalSection>

      <LegalSection title="Envíos y entregas">
        <p>
          Los plazos y costos de envío dependen de la ubicación y del transportista.
          Los indicados en el checkout son orientativos; Factores externos pueden
          atrasar una entrega. Las políticas de cambios o devoluciones te las
          comunicamos en el proceso de compra o por{" "}
          <a
            className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
            href={`mailto:${storeSupportEmail}`}
          >
            {storeSupportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Propiedad intelectual">
        <p>
          Contenidos del sitio (textos, diseño, logotipos, imágenes propias) están
          protegidos. No podés copiarlos para uso comercial sin autorización.
        </p>
      </LegalSection>

      <LegalSection title="Enlaces">
        <p>
          El sitio puede enlazar a redes u otros servicios de terceros; no somos
          responsables de sus contenidos ni políticas.
        </p>
      </LegalSection>

      <LegalSection title="Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley aplicable, no seremos responsables por
          daños indirectos o lucro cesante derivados del uso del sitio o
          interrupciones temporales del servicio. Nuestra responsabilidad frente a
          un producto defectuoso o incumplimiento se regirá por la ley del consumidor
          y las políticas de garantía o devolución que correspondan.
        </p>
      </LegalSection>

      <LegalSection title="Ley aplicable">
        <p>
          Estos términos se interpretan según las leyes de la República de Colombia.
          Para reclamos, primero contactanos en{" "}
          <a
            className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
            href={`mailto:${storeSupportEmail}`}
          >
            {storeSupportEmail}
          </a>{" "}
          o al teléfono publicado en el sitio ({storeSupportPhone}).
        </p>
      </LegalSection>

      <LegalSection title="Modificaciones">
        <p>
          Podemos actualizar estos términos; la fecha indicada arriba refleja la
          última versión. Te recomendamos revisarlos periódicamente.
        </p>
      </LegalSection>

      <p className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 text-xs text-stone-600">
        Documento modelo para comercio electrónico. Ajustalo con asesoría legal a
        tus políticas reales de envíos, devoluciones y medios de pago.
      </p>

      <p className="text-sm">
        <Link
          href="/privacidad"
          className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
        >
          Política de privacidad
        </Link>
        {" · "}
        <Link
          href="/cookies"
          className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
        >
          Política de cookies
        </Link>
      </p>
    </LegalDocument>
  );
}
