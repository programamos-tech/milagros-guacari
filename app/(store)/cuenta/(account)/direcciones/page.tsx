import Link from "next/link";
import { updateStoreCustomerBirthDateAction } from "@/app/actions/store-customer-birthday";
import { StoreAddressesManager } from "@/components/store/StoreAddressesManager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeBrand, storeSupportEmail, storeWhatsAppUrl } from "@/lib/brand";

export const metadata = {
  title: "Ajustes",
};

const cardClass =
  "border border-stone-200 bg-white px-6 py-8 sm:px-8 sm:py-9";
const cardTitle =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]";
const btnOutline =
  "inline-flex shrink-0 items-center justify-center border border-[var(--store-accent)] bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--store-accent)] transition hover:bg-[var(--store-accent)] hover:text-white";
const labelMuted = "text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500";
const valueText = "mt-1 text-sm text-stone-900";
const dateInputClass =
  "mt-2 w-full max-w-[12rem] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-[0_1px_0_0_rgb(24_24_27/0.04)] focus:border-[var(--store-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--store-accent)]/20";
const btnSaveClass =
  "inline-flex shrink-0 items-center justify-center border border-[var(--store-accent)] bg-[var(--store-accent)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--store-accent-hover)]";

function profileLocationLine(
  city: string | null | undefined,
  address: string | null | undefined,
): string {
  const c = city?.trim();
  const a = address?.trim();
  if (c && a) return `${c} · ${a}`;
  if (c) return c;
  if (a) return a;
  return "Colombia";
}

function formatBirthDisplay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CuentaDireccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ cumple?: string }>;
}) {
  const sp = await searchParams;
  const cumple = typeof sp.cumple === "string" ? sp.cumple : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = user?.user_metadata as { full_name?: string } | undefined;

  const { data: customer } = await supabase
    .from("customers")
    .select("name, email, shipping_city, shipping_address, birth_date")
    .maybeSingle();

  const displayName =
    customer?.name?.trim() ||
    meta?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "—";
  const email = user?.email ?? customer?.email ?? "—";
  const location = profileLocationLine(
    customer?.shipping_city,
    customer?.shipping_address,
  );

  const waEdit =
    storeWhatsAppUrl !== "#"
      ? `${storeWhatsAppUrl}?text=${encodeURIComponent("Hola, quiero actualizar los datos de mi perfil.")}`
      : storeWhatsAppUrl;

  const birthIso =
    customer?.birth_date != null && String(customer.birth_date).trim() !== ""
      ? String(customer.birth_date).slice(0, 10)
      : "";
  const maxBirth = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="text-center text-sm font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)] sm:text-[15px] sm:tracking-[0.26em]">
        Ajustes
      </h1>

      <article className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className={cardTitle}>Perfil</h2>
          <Link href={waEdit} className={btnOutline} target="_blank" rel="noopener noreferrer">
            Editar
          </Link>
        </div>
        <div className="mt-8 space-y-5">
          <div>
            <p className={labelMuted}>Nombre</p>
            <p className={valueText}>{displayName}</p>
          </div>
          <div>
            <p className={labelMuted}>Email</p>
            <p className={valueText}>{email}</p>
          </div>
          <div>
            <p className={labelMuted}>Ubicación</p>
            <p className={valueText}>{location}</p>
          </div>
          <div className="border-t border-stone-100 pt-6">
            <p className={labelMuted}>Cumpleaños</p>
            {birthIso ? (
              <p className={valueText}>
                Registrado:{" "}
                <span className="font-medium">{formatBirthDisplay(birthIso)}</span>
              </p>
            ) : (
              <p className={`${valueText} text-stone-600`}>
                Todavía no registramos tu fecha. Guardala abajo para recibir un saludo especial.
              </p>
            )}
            {cumple === "ok" ? (
              <p className="mt-3 rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-900">
                Fecha de cumpleaños guardada.
              </p>
            ) : null}
            {cumple === "invalid" || cumple === "db" || cumple === "forbidden" ? (
              <p className="mt-3 rounded-lg border border-red-200/90 bg-red-50/90 px-3 py-2 text-xs font-medium text-red-900">
                {cumple === "invalid"
                  ? "Revisá la fecha (debe ser válida y no futura)."
                  : cumple === "forbidden"
                    ? "Esta acción no está disponible para tu tipo de usuario."
                    : "No pudimos guardar. Intentá de nuevo."}
              </p>
            ) : null}
            <form
              action={updateStoreCustomerBirthDateAction}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <input type="hidden" name="next" value="/cuenta/direcciones" readOnly />
              <div className="min-w-0">
                <label htmlFor="cuenta-birth-date" className="sr-only">
                  Fecha de cumpleaños
                </label>
                <input
                  id="cuenta-birth-date"
                  type="date"
                  name="birth_date"
                  required
                  min="1900-01-01"
                  max={maxBirth}
                  defaultValue={birthIso || undefined}
                  className={dateInputClass}
                />
              </div>
              <button type="submit" className={btnSaveClass}>
                Guardar fecha
              </button>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              Podés cambiarla cuando quieras. Los datos de nombre y correo siguen gestionándose por{" "}
              <Link href={waEdit} className="font-medium text-stone-700 underline underline-offset-2">
                WhatsApp
              </Link>
              .
            </p>
          </div>
        </div>
      </article>

      <article className={cardClass}>
        <StoreAddressesManager variant="settings" />
      </article>

      <article className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className={cardTitle}>Preferencias de correo</h2>
          <a
            href={`mailto:${storeSupportEmail}?subject=${encodeURIComponent("Preferencias de correo")}`}
            className={btnOutline}
          >
            Editar
          </a>
        </div>
        <p className="mt-8 text-sm leading-relaxed text-stone-600">
          Recibís novedades y comunicaciones de{" "}
          <span className="font-medium text-stone-800">{storeBrand}</span>{" "}
          asociadas a tu cuenta. Para cambiar la frecuencia o darte de baja,
          escríbenos por correo.
        </p>
      </article>
    </div>
  );
}
