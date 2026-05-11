import Link from "next/link";
import {
  storeBrand,
  storeCopyrightHolder,
  storeSupportEmail,
} from "@/lib/brand";
import {
  LegalDocument,
  LegalSection,
} from "@/components/store/legal-document";

export const metadata = {
  title: `Política de privacidad | ${storeBrand}`,
  description: `Cómo tratamos tus datos personales en ${storeBrand}.`,
};

export default function PrivacidadPage() {
  const updatedLabel = "Última actualización: 8 de mayo de 2026";

  return (
    <LegalDocument title="Política de privacidad" updatedLabel={updatedLabel}>
      <p>
        En {storeBrand} ({storeCopyrightHolder}) respetamos tu privacidad. Esta
        política describe de forma general qué información podemos recopilar,
        para qué la usamos y qué derechos tienes. Si necesitás detalles
        específicos de tu caso, escribinos.
      </p>

      <LegalSection title="Responsable del tratamiento">
        <p>
          <strong>{storeCopyrightHolder}</strong>, operando la tienda en línea{" "}
          <strong>{storeBrand}</strong>. Para consultas sobre datos personales:{" "}
          <a
            className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
            href={`mailto:${storeSupportEmail}`}
          >
            {storeSupportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Datos que podemos tratar">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Identificación y contacto:</strong> nombre, correo, teléfono,
            dirección de envío o facturación cuando los proporcionás al comprar o
            registrarte.
          </li>
          <li>
            <strong>Datos de la cuenta:</strong> historial de pedidos,
            preferencias que guardes en la tienda.
          </li>
          <li>
            <strong>Técnicos:</strong> dirección IP, tipo de navegador, páginas
            visitadas y cookies (ver nuestra política de cookies).
          </li>
          <li>
            <strong>Pagos:</strong> los datos de tarjeta u otros medios los
            procesan proveedores de pago certificados; nosotros no almacenamos el
            número completo de tu tarjeta.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Finalidades">
        <ul className="list-disc space-y-2 pl-5">
          <li>Gestionar tu registro, pedidos, envíos y postventa.</li>
          <li>Cumplir obligaciones legales y tributarias.</li>
          <li>Mejorar el sitio, seguridad y prevención de fraude.</li>
          <li>
            Enviarte comunicaciones relacionadas con tu compra o, si lo
            autorizás, novedades comerciales.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Base legal">
        <p>
          Tratamos tus datos según la legislación colombiana aplicable (entre
          otras, la Ley 1581 de 2012 y el Decreto 1377 de 2013), en particular por
          la ejecución de un contrato de compraventa, tu consentimiento cuando sea
          necesario, nuestro interés legítimo en operar la tienda de forma segura o
          el cumplimiento de obligaciones legales.
        </p>
      </LegalSection>

      <LegalSection title="Conservación">
        <p>
          Conservamos los datos el tiempo necesario para las finalidades
          indicadas y los plazos legales aplicables (por ejemplo, aspectos
          contables o reclamos).
        </p>
      </LegalSection>

      <LegalSection title="Tus derechos">
        <p>
          Podés solicitar acceso, rectificación, actualización o supresión cuando
          corresponda, revocar autorizaciones y consultar el uso de tus datos.
          Para ejercerlos, escribinos a{" "}
          <a
            className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
            href={`mailto:${storeSupportEmail}`}
          >
            {storeSupportEmail}
          </a>
          . También podés presentar una queja ante la Superintendencia de
          Industria y Comercio cuando proceda.
        </p>
      </LegalSection>

      <LegalSection title="Seguridad y encargados">
        <p>
          Aplicamos medidas razonables para proteger la información. Podemos
          encargar el tratamiento a proveedores de hosting, correo, pasarela de
          pago o envíos, con obligaciones de confidencialidad y tratamiento
          acorde a la ley.
        </p>
      </LegalSection>

      <LegalSection title="Menores de edad">
        <p>
          El sitio está dirigido a mayores de edad. Si creés que registramos datos
          de un menor sin autorización, escribinos para eliminarlos.
        </p>
      </LegalSection>

      <LegalSection title="Cambios">
        <p>
          Podemos actualizar esta política; la fecha arriba indica la última
          revisión. El uso continuado del sitio después de cambios relevantes
          implica que tomaste conocimiento de la versión vigente.
        </p>
      </LegalSection>

      <p className="text-sm">
        <Link
          href="/terminos"
          className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
        >
          Términos de uso
        </Link>
        {" · "}
        <Link
          href="/cookies"
          className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
        >
          Política de cookies
        </Link>
      </p>

      <p className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 text-xs text-stone-600">
        Este texto es informativo y estándar para tiendas en línea. No sustituye
        asesoría legal personalizada; conviene revisarlo con un abogado según tu
        modelo de negocio y tratamiento real de datos.
      </p>
    </LegalDocument>
  );
}
