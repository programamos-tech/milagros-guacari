import Link from "next/link";
import { storeBrand, storeCopyrightHolder, storeSupportEmail } from "@/lib/brand";
import {
  LegalDocument,
  LegalSection,
} from "@/components/store/legal-document";

export const metadata = {
  title: `Política de cookies | ${storeBrand}`,
  description: `Uso de cookies y tecnologías similares en ${storeBrand}.`,
};

export default function CookiesPage() {
  const updatedLabel = "Última actualización: 8 de mayo de 2026";

  return (
    <LegalDocument title="Política de cookies" updatedLabel={updatedLabel}>
      <p>
        En <strong>{storeBrand}</strong> ({storeCopyrightHolder}) utilizamos
        cookies y almacenamiento local cuando es necesario para que la tienda
        funcione correctamente. Esta página resume qué son y cómo podés gestionar
        tus preferencias.
      </p>

      <LegalSection title="Qué son las cookies">
        <p>
          Son pequeños archivos o identificadores que el navegador guarda en tu
          dispositivo. Permiten recordar acciones o preferencias durante un tiempo.
        </p>
      </LegalSection>

      <LegalSection title="Qué usamos en esta tienda">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Cookies o almacenamiento técnicos / necesarios:</strong> por
            ejemplo, para mantener tu sesión de administración si corresponde, o
            datos imprescindibles del funcionamiento del sitio.
          </li>
          <li>
            <strong>Bolsa de compras y preferencias locales:</strong> guardamos
            líneas de bolsa y, si aceptás el aviso, tu elección sobre cookies en{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
              localStorage
            </code>{" "}
            del navegador (sin enviarla a nuestros servidores como cookie HTTP en
            todos los casos).
          </li>
          <li>
            <strong>Analítica o marketing de terceros:</strong> si en el futuro
            incorporamos herramientas de medición o publicidad, actualizaremos
            esta política y, cuando la ley lo exija, pediremos consentimiento.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Duración">
        <p>
          Las cookies de sesión caducan al cerrar el navegador; otras pueden
          persistir hasta que las borres o hasta su fecha de expiración. Tu elección
          en el banner de cookies se conserva localmente hasta que la cambies o
          borres los datos del sitio.
        </p>
      </LegalSection>

      <LegalSection title="Cómo gestionarlas">
        <p>
          Podés bloquear o eliminar cookies desde la configuración de tu navegador
          (Chrome, Safari, Firefox, etc.). Tené en cuenta que desactivar cookies
          necesarias puede impedir usar la bolsa o finalizar la compra.
        </p>
      </LegalSection>

      <LegalSection title="Consentimiento">
        <p>
          Mostramos un aviso en tu primera visita para aceptar o limitar el uso
          no esencial conforme a nuestra configuración actual. Podés modificar tu
          decisión borrando el almacenamiento del sitio o contactándonos.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <p>
          Consultas sobre esta política:{" "}
          <a
            className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
            href={`mailto:${storeSupportEmail}`}
          >
            {storeSupportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <p className="text-sm">
        <Link
          href="/privacidad"
          className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
        >
          Política de privacidad
        </Link>
        {" · "}
        <Link
          href="/terminos"
          className="font-medium text-stone-900 underline underline-offset-2 hover:no-underline"
        >
          Términos de uso
        </Link>
      </p>
    </LegalDocument>
  );
}
