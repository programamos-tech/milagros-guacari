import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { startCheckout } from "@/app/actions/checkout";
import { syncStoreCustomerFromSession } from "@/app/actions/store-customer";
import { ensureStoreCustomerLinked } from "@/lib/store-customer-service";
import {
  isCartKitLine,
  isCartProductLine,
  normalizeCartForCheckout,
} from "@/lib/cart";
import { fetchKitsWithItems } from "@/lib/load-product-kits";
import {
  maxKitsAvailableFromItems,
  resolveKitSalePriceCents,
} from "@/lib/product-kits";
import {
  getStorefrontCartLines,
} from "@/lib/storefront-cart";
import { CheckoutKitLineControls } from "@/components/store/CheckoutKitLineControls";
import { formatCop } from "@/lib/money";
import {
  unitPriceAfterWholesaleCents,
  wholesaleDiscountPercentFromRow,
} from "@/lib/customer-wholesale-pricing";
import {
  storefrontListGrossUnitCents,
  storefrontPayableUnitGrossCents,
} from "@/lib/storefront-gross-price";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { imagePathForProductLine } from "@/lib/product-line-image";
import {
  shouldUnoptimizeStorageImageUrl,
  storagePublicObjectUrl,
} from "@/lib/storage-public-url";
import { CartUpsellScroller } from "@/components/store/CartUpsellScroller";
import {
  CheckoutShippingFields,
  type CheckoutSavedAddress,
  type CheckoutShippingInitial,
} from "@/components/store/CheckoutShippingFields";
import {
  CheckoutShippingTotals,
  CheckoutSubmitButton,
} from "@/components/store/CheckoutCitySelect";
import { CheckoutCouponField } from "@/components/store/CheckoutCouponField";
import { CheckoutShippingProvider } from "@/components/store/CheckoutShippingProvider";
import { CheckoutSubmittingOverlay } from "@/components/store/CheckoutSubmittingOverlay";
import { CheckoutLineControls } from "@/components/store/CheckoutLineControls";
import {
  CART_DRAWER_UPSELL_LIMIT,
  loadStoreCartUpsells,
} from "@/lib/store-cart-upsells";
import type { StoreShippingMunicipalityPublic } from "@/lib/store-shipping";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-900";
const inputClass =
  "w-full border-0 border-b border-stone-300 bg-transparent py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[var(--store-accent)] focus:outline-none focus:ring-0";
const selectClass =
  "w-full border border-stone-300 bg-white px-0 py-2.5 text-sm text-stone-900 focus:border-[var(--store-accent)] focus:outline-none focus:ring-0";
const sidebarInputClass =
  "mt-3 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[var(--store-accent)] focus:outline-none";
const primaryBtnClass =
  "w-full bg-[var(--store-accent)] py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--store-accent-hover)]";
const secondaryBtnClass =
  "flex w-full items-center justify-center border border-[var(--store-accent)] bg-white py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent)] transition hover:bg-[#fff8fb]";

function firstColorLabel(colors: unknown): string | null {
  if (!Array.isArray(colors) || colors.length === 0) return null;
  const c = colors[0];
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

function productShortRef(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function CheckoutErrorBanner({
  error,
  message,
  unpublishedProduct,
}: {
  error?: string;
  message?: string;
  unpublishedProduct?: string;
}) {
  if (!error) return null;
  return (
    <div
      className="mx-auto mb-8 max-w-3xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      {error === "missing_name" && "Ingresa nombre y apellido."}
      {error === "invalid_email" && "Email inválido."}
      {error === "missing_shipping" &&
        "Completa dirección y teléfono de contacto."}
      {error === "shipping_municipality" &&
        "Selecciona un municipio de envío de la lista. Si el tuyo no aparece, contáctanos por WhatsApp."}
      {error === "products" &&
        "No se pudieron cargar los productos del pedido. Si persiste, revisa la conexión o prueba más tarde."}
      {error === "unpublished" &&
        (unpublishedProduct
          ? `${decodeURIComponent(unpublishedProduct)} ya no está disponible en la tienda. Quita ese producto de la bolsa o elige otro.`
          : "Hay productos en tu bolsa que ya no están publicados. Abre la bolsa desde el ícono o actualiza desde el catálogo.")}
      {error === "order" && "No se pudo crear el pedido."}
      {error === "items" && "No se pudieron guardar los ítems del pedido."}
      {error === "coupon_invalid" &&
        "El cupón no es válido o ya no está activo. Revísalo e intenta de nuevo."}
      {error === "coupon_no_eligible_items" &&
        "Este cupón solo aplica a productos concretos y tu bolsa no tiene ninguno de ellos. Agrega un producto de la promo o quita el cupón."}
      {error === "wompi" &&
        (message
          ? `Wompi: ${decodeURIComponent(message)}`
          : "Error al crear el enlace de pago en Wompi.")}
      {error === "account_link" &&
        "No pudimos vincular tu cuenta con el cliente del pedido. Si el correo ya está en uso por otra cuenta, inicia sesión con ese correo o escríbenos."}
      {![
        "missing_name",
        "invalid_email",
        "missing_shipping",
        "shipping_municipality",
        "products",
        "unpublished",
        "coupon_invalid",
        "coupon_no_eligible_items",
        "order",
        "items",
        "wompi",
        "account_link",
        "empty",
        "stock",
        "removed",
      ].includes(error) && "Ocurrió un error."}
    </div>
  );
}

function CheckoutBolsaVaciaView({
  error,
  message,
  unpublishedProduct,
  infoReason,
}: {
  error?: string;
  message?: string;
  unpublishedProduct?: string;
  infoReason?: "invalid_lines";
}) {
  const stock = error === "stock";
  const removed = error === "removed";
  const explicitEmpty = error === "empty";
  const showFormError =
    error &&
    error !== "stock" &&
    error !== "removed" &&
    error !== "empty";

  const title =
    infoReason === "invalid_lines"
      ? "Tu bolsa se actualizó"
      : stock
        ? "No hay stock suficiente"
        : removed
          ? "Un producto ya no está disponible"
          : explicitEmpty
            ? "Tu bolsa está vacía"
            : "Tu bolsa está vacía";

  const body =
    infoReason === "invalid_lines"
      ? "Los productos de tu bolsa ya no cumplen stock o publicación. Elige otros artículos en el catálogo."
      : stock
        ? "No pudimos completar el pedido por stock. Explora el catálogo y elige otras opciones."
        : removed
          ? "Un ítem ya no está disponible. Te invitamos a descubrir más productos."
          : explicitEmpty
            ? "Agrega productos desde el catálogo; puedes abrir la bolsa en cualquier momento con el ícono superior."
            : "Explora el catálogo y suma productos a tu bolsa cuando quieras.";

  return (
    <div data-checkout-root className="min-h-[calc(100vh-8rem)] bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:pb-16 lg:pt-12">
        <nav
          aria-label="Migas de pan"
          className="mb-8 text-[11px] uppercase tracking-[0.12em] text-stone-400"
        >
          <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
            <li>
              <Link href="/" className="transition hover:text-stone-800">
                Inicio
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li className="text-stone-600">Bolsa de compras</li>
          </ol>
        </nav>

        <h1 className="text-center text-sm font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)] sm:text-left sm:text-[15px] sm:tracking-[0.26em]">
          Bolsa de compras
        </h1>

        {stock ? (
          <div
            className="mx-auto mb-8 max-w-3xl bg-stone-100 px-4 py-3 text-center text-[13px] text-stone-700 sm:text-left"
            role="status"
          >
            No hay stock suficiente para un producto de la bolsa. Ajusta las
            cantidades desde el ícono de la bolsa o en esta pantalla cuando
            tengas ítems disponibles.
          </div>
        ) : null}
        {removed ? (
          <div
            className="mx-auto mb-8 max-w-3xl bg-stone-100 px-4 py-3 text-center text-[13px] text-stone-700 sm:text-left"
            role="status"
          >
            Un producto de la bolsa ya no existe en la tienda. Actualizamos tu
            pedido.
          </div>
        ) : null}

        {showFormError ? (
          <CheckoutErrorBanner
            error={error}
            message={message}
            unpublishedProduct={unpublishedProduct}
          />
        ) : null}

        <div className="mx-auto mt-12 max-w-lg border border-stone-200 bg-white px-8 py-14 text-center">
          <div
            className="mx-auto flex size-11 items-center justify-center text-stone-300"
            aria-hidden
          >
            <ShoppingBag className="size-10" strokeWidth={1.15} />
          </div>
          <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)]">
            {title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">{body}</p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center bg-[var(--store-accent)] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--store-accent-hover)]"
            >
              Ver productos
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center border border-[var(--store-accent)] bg-white px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-accent)] transition hover:bg-[#fff8fb]"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const message = typeof sp.message === "string" ? sp.message : undefined;
  const unpublishedProduct =
    typeof sp.product === "string" ? sp.product : undefined;

  const displayCart = await getStorefrontCartLines();
  if (!displayCart.length) {
    return (
      <CheckoutBolsaVaciaView
        error={error}
        message={message}
        unpublishedProduct={unpublishedProduct}
      />
    );
  }

  await syncStoreCustomerFromSession();

  const sessionSb = await createSupabaseServerClient();
  const {
    data: { user: checkoutUser },
  } = await sessionSb.auth.getUser();
  let accountEmail: string | null = null;
  let defaultFirst = "";
  let defaultLast = "";
  const shippingInitial: CheckoutShippingInitial = {
    firstName: "",
    lastName: "",
    profileAddressLine: "",
    city: "",
    mobile: "",
    municipalityId: "",
  };
  let savedAddresses: CheckoutSavedAddress[] = [];
  let wholesaleDisplayPct = 0;

  if (checkoutUser?.email) {
    accountEmail = checkoutUser.email;
    const meta = checkoutUser.user_metadata as
      | { full_name?: string; document_id?: string }
      | undefined;
    const full = meta?.full_name?.trim();
    if (full) {
      const parts = full.split(/\s+/).filter(Boolean);
      defaultFirst = parts[0] ?? "";
      defaultLast = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }

    const { data: adminProf } = await sessionSb
      .from("profiles")
      .select("id")
      .eq("id", checkoutUser.id)
      .maybeSingle();

    if (!adminProf) {
      await ensureStoreCustomerLinked(
        checkoutUser.id,
        checkoutUser.email,
        full ?? null,
        meta?.document_id ?? null,
      );
    }

    const { data: cust } = await sessionSb
      .from("customers")
      .select(
        "id, name, phone, shipping_address, shipping_city, shipping_postal_code, customer_kind, wholesale_discount_percent",
      )
      .eq("auth_user_id", checkoutUser.id)
      .maybeSingle();

    if (!adminProf && cust) {
      wholesaleDisplayPct = wholesaleDiscountPercentFromRow(
        cust as {
          customer_kind?: string | null;
          wholesale_discount_percent?: number | null;
        },
      );
    }

    if (cust) {
      const customerId = String(cust.id);

      const [{ data: lastOrder }, { data: addrs }] = await Promise.all([
        sessionSb
          .from("orders")
          .select(
            "customer_name, shipping_address, shipping_city, shipping_postal_code, shipping_phone, shipping_municipality_id",
          )
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sessionSb
          .from("customer_addresses")
          .select("id, label, address_line, reference, sort_order")
          .eq("customer_id", customerId)
          .order("sort_order", { ascending: true }),
      ]);

      const orderName = lastOrder?.customer_name?.trim() ?? "";
      const profileName = cust.name?.trim() ?? "";
      const nm = orderName || profileName;
      if (nm) {
        const parts = nm.split(/\s+/).filter(Boolean);
        shippingInitial.firstName = parts[0] ?? defaultFirst;
        shippingInitial.lastName =
          parts.length > 1 ? parts.slice(1).join(" ") : defaultLast;
      } else {
        shippingInitial.firstName = defaultFirst;
        shippingInitial.lastName = defaultLast;
      }

      shippingInitial.profileAddressLine =
        lastOrder?.shipping_address?.trim() ||
        cust.shipping_address?.trim() ||
        "";
      shippingInitial.city =
        lastOrder?.shipping_city?.trim() || cust.shipping_city?.trim() || "";
      shippingInitial.mobile =
        lastOrder?.shipping_phone?.trim() ||
        cust.phone?.trim() ||
        checkoutUser.phone?.trim() ||
        "";
      shippingInitial.municipalityId =
        lastOrder?.shipping_municipality_id != null
          ? String(lastOrder.shipping_municipality_id)
          : "";

      savedAddresses = (addrs ?? []) as CheckoutSavedAddress[];
    } else {
      shippingInitial.firstName = defaultFirst;
      shippingInitial.lastName = defaultLast;
      const authPhone = checkoutUser.phone?.trim();
      if (authPhone) {
        shippingInitial.mobile = authPhone;
      }
    }
  }

  const productLines = displayCart.filter(isCartProductLine);
  const kitLines = displayCart.filter(isCartKitLine);

  const supabase = createSupabaseServiceClient();
  const productIds = [...new Set(productLines.map((l) => l.productId))];
  let products: {
    id: string;
    name: string;
    price_cents: number;
    has_vat: boolean | null;
    image_path: string | null;
    fragrance_option_images: unknown;
    stock_quantity: number | null;
    colors: unknown;
    is_published: boolean | null;
  }[] = [];

  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select(
        "id,name,price_cents,has_vat,image_path,fragrance_option_images,is_published,stock_quantity,colors",
      )
      .in("id", productIds);
    products = data ?? [];
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const normalizedProducts = normalizeCartForCheckout(productLines, byId);
  const cartAdjusted =
    JSON.stringify(productLines) !== JSON.stringify(normalizedProducts);

  const kitsPromise =
    kitLines.length > 0
      ? fetchKitsWithItems(supabase, { publishedOnly: true })
      : Promise.resolve([]);

  const [kits, cartUpsellProducts, municipalityRes] = await Promise.all([
    kitsPromise,
    loadStoreCartUpsells(sessionSb, productIds, CART_DRAWER_UPSELL_LIMIT),
    supabase
      .from("store_shipping_municipalities")
      .select("id, name, department, rate_cents")
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const kitsById = new Map(kits.map((k) => [k.id, k]));

  const rows = normalizedProducts.map((line) => {
    const p = byId.get(line.productId)!;
    const netUnit = unitPriceAfterWholesaleCents(
      p.price_cents,
      wholesaleDisplayPct,
    );
    const grossUnit = storefrontPayableUnitGrossCents(
      p.price_cents,
      p.has_vat,
      wholesaleDisplayPct,
    );
    const listGrossUnit = storefrontListGrossUnitCents(p.price_cents, p.has_vat);
    const sub = grossUnit * line.quantity;
    const catalogListLineGross = listGrossUnit * line.quantity;
    const netLine = netUnit * line.quantity;
    return { line, p, sub, catalogListLineGross, netLine };
  });

  const kitRows = kitLines
    .map((line) => {
      const kit = kitsById.get(line.kitId);
      if (!kit) return null;
      const items = kit.items ?? [];
      const unit = resolveKitSalePriceCents(kit, items, "storefront");
      const sub = unit * line.quantity;
      const maxStock = maxKitsAvailableFromItems(items, "storefront");
      return { line, kit, sub, maxStock, unit };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const catalogListTotalGross = rows.reduce(
    (acc, r) => acc + r.catalogListLineGross,
    0,
  );
  const totalGross =
    rows.reduce((acc, r) => acc + r.sub, 0) +
    kitRows.reduce((acc, r) => acc + r.sub, 0);
  const totalNet =
    rows.reduce((acc, r) => acc + r.netLine, 0) +
    kitRows.reduce((acc, r) => acc + r.sub, 0);
  const totalVat = Math.max(0, totalGross - totalNet);
  const wholesaleSavingCents = Math.max(0, catalogListTotalGross - totalGross);

  const municipalityRows = municipalityRes.data;
  const municipalities: StoreShippingMunicipalityPublic[] = (
    municipalityRows ?? []
  ).map((m) => ({
    id: String(m.id),
    name: String(m.name),
    department: m.department != null ? String(m.department) : null,
    rate_cents: Math.max(0, Number(m.rate_cents ?? 0)),
  }));

  return (
    <div data-checkout-root className="min-h-[calc(100vh-8rem)] bg-white">
      <div className="store-page-stagger mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:pb-16 lg:pt-12">
        <nav aria-label="Migas de pan" className="store-page-stagger-item mb-8 text-[11px] uppercase tracking-[0.12em] text-stone-400">
          <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
            <li>
              <Link href="/" className="transition hover:text-stone-800">
                Inicio
              </Link>
            </li>
            <li aria-hidden className="text-stone-300">
              /
            </li>
            <li className="text-stone-600">Bolsa de compras</li>
          </ol>
        </nav>

        <h1 className="store-page-stagger-item text-center text-sm font-semibold uppercase tracking-[0.22em] text-[var(--store-brand)] sm:text-left sm:text-[15px] sm:tracking-[0.26em]">
          Bolsa de compras
        </h1>

        {cartAdjusted ? (
          <div
            className="mx-auto mb-8 max-w-3xl bg-stone-100 px-4 py-3 text-center text-[13px] text-stone-700 sm:text-left"
            role="status"
          >
            Actualizamos tu pedido según stock y productos publicados en la tienda.
          </div>
        ) : null}

        <CheckoutErrorBanner
          error={error}
          message={message}
          unpublishedProduct={unpublishedProduct}
        />

        <form action={startCheckout}>
          <CheckoutSubmittingOverlay />
          <CheckoutShippingProvider
            municipalities={municipalities}
            subtotalCents={totalGross}
            initialCity={shippingInitial.city}
            initialMunicipalityId={shippingInitial.municipalityId}
          >
          <div className="store-page-stagger-item mt-10 grid gap-12 lg:grid-cols-[1fr_min(100%,340px)] lg:items-start xl:gap-16">
            <div className="store-page-stagger min-w-0 space-y-14">
              <section className="store-page-stagger-item">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
                  Carrito
                </h2>
                <ul className="mt-6 divide-y divide-stone-200">
                  {rows.map(({ line, p, sub, catalogListLineGross }) => {
                    const row = p as typeof p & {
                      colors?: unknown;
                      fragrance_option_images?: unknown;
                    };
                    const frag = line.fragrance?.trim() || null;
                    const linePath = imagePathForProductLine(
                      p.image_path,
                      row.fragrance_option_images,
                      frag ?? undefined,
                    );
                    const img = storagePublicObjectUrl(linePath);
                    const maxStock = Math.max(
                      0,
                      Math.floor(Number(p.stock_quantity ?? 0)),
                    );
                    const color = firstColorLabel(row.colors);
                    const showWholesaleLine =
                      wholesaleDisplayPct > 0 && catalogListLineGross > sub;

                    return (
                      <li
                        key={`${p.id}-${frag ?? ""}`}
                        className="flex flex-col gap-6 py-10 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
                      >
                        <div className="flex min-w-0 flex-1 gap-5 sm:gap-8">
                          <Link
                            href={`/products/${p.id}`}
                            className="relative aspect-[3/4] w-[6.75rem] shrink-0 overflow-hidden bg-[#f0eeeb] sm:w-28"
                          >
                            {img ? (
                              <Image
                                src={img}
                                alt=""
                                fill
                                className="object-cover object-center"
                                sizes="112px"
                                unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-stone-300">
                                ◆
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/products/${p.id}`}
                              className="text-[15px] font-semibold leading-snug text-[var(--store-brand)] transition hover:text-[var(--store-brand-hover)]"
                            >
                              {p.name}
                            </Link>
                            <ul className="mt-3 space-y-1 text-[13px] text-stone-600">
                              {frag ? (
                                <li>
                                  <span className="text-stone-500">
                                    Fragancia / tono:
                                  </span>{" "}
                                  {frag}
                                </li>
                              ) : null}
                              {color ? (
                                <li>
                                  <span className="text-stone-500">Color:</span>{" "}
                                  {color}
                                </li>
                              ) : null}
                              <li className="tabular-nums text-stone-500">
                                Ref.{" "}
                                <span className="text-stone-700">
                                  {productShortRef(p.id)}
                                </span>
                              </li>
                            </ul>
                            <CheckoutLineControls
                              productId={p.id}
                              quantity={line.quantity}
                              maxStock={maxStock}
                              fragrance={frag}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-left sm:pt-0.5 sm:text-right">
                          {showWholesaleLine ? (
                            <div className="space-y-1">
                              <p className="text-xs tabular-nums text-stone-400 line-through">
                                {formatCop(catalogListLineGross)}
                              </p>
                              <p className="text-[15px] font-medium tabular-nums text-stone-900">
                                {formatCop(sub)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[15px] font-medium tabular-nums text-stone-900">
                              {formatCop(sub)}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {kitRows.map(({ line, kit, sub, maxStock }) => {
                    const img = storagePublicObjectUrl(kit.image_path);
                    return (
                      <li
                        key={`kit-${kit.id}`}
                        className="flex flex-col gap-6 py-10 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
                      >
                        <div className="flex min-w-0 flex-1 gap-5 sm:gap-8">
                          <Link
                            href="/kits"
                            className="relative aspect-[3/4] w-[6.75rem] shrink-0 overflow-hidden bg-[#f0eeeb] sm:w-28"
                          >
                            {img ? (
                              <Image
                                src={img}
                                alt=""
                                fill
                                className="object-cover object-center"
                                sizes="112px"
                                unoptimized={shouldUnoptimizeStorageImageUrl(img)}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-stone-300">
                                ◆
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href="/kits"
                              className="text-[15px] font-semibold leading-snug text-[var(--store-brand)] transition hover:text-[var(--store-brand-hover)]"
                            >
                              {kit.name}
                            </Link>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                              Kit / combo
                            </p>
                            <CheckoutKitLineControls
                              kitId={kit.id}
                              quantity={line.quantity}
                              maxStock={maxStock}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-left sm:pt-0.5 sm:text-right">
                          <p className="text-[15px] font-medium tabular-nums text-stone-900">
                            {formatCop(sub)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <CartUpsellScroller
                  products={cartUpsellProducts}
                  titleId="checkout-cart-upsell-title"
                  subtitle="Agrega en un clic"
                  className="border-t border-stone-200 pt-10"
                />
              </section>

              <section className="store-page-stagger-item border-t border-stone-200 pt-12">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
                  Datos de envío
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  Coordinamos la entrega en Colombia.
                </p>

                <CheckoutShippingFields
                  initial={
                    accountEmail
                      ? shippingInitial
                      : {
                          ...shippingInitial,
                          firstName: shippingInitial.firstName || defaultFirst,
                          lastName: shippingInitial.lastName || defaultLast,
                        }
                  }
                  savedAddresses={accountEmail ? savedAddresses : []}
                  accountEmail={accountEmail}
                  labelClass={labelClass}
                  inputClass={inputClass}
                  selectClass={selectClass}
                />
              </section>

              <section className="store-page-stagger-item border-t border-stone-200 pt-12">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)]">
                  Forma de pago
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  El pago se realiza únicamente por transferencia bancaria. Al finalizar verás las cuentas
                  disponibles (Bancolombia, Nequi o Daviplata) y podrás adjuntar el comprobante en los 2
                  minutos posteriores a cada vez que habilites la subida.
                </p>
                <input type="hidden" name="paymentMethod" value="transfer" />
                <div className="mt-6 border border-[var(--store-accent)] bg-white p-4 ring-1 ring-[var(--store-accent)]">
                  <p className="text-sm font-medium text-stone-900">
                    Transferencia bancaria
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Recibirás los datos para transferir y un formulario para subir el comprobante de
                    pago.
                  </p>
                </div>
              </section>
            </div>

            <aside className="store-page-stagger-item sticky top-28 space-y-6 bg-[#f4f4f3] p-6 lg:p-8">
              <details className="group border-b border-stone-300/80 pb-5 open:pb-4">
                <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--store-brand)] marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    Código promocional
                    <span className="text-stone-400 transition group-open:rotate-180">
                      ▾
                    </span>
                  </span>
                </summary>
                <CheckoutCouponField className={sidebarInputClass} />
                <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                  Si tienes un cupón activo para estos productos, ingrésalo aquí antes de pagar.
                </p>
              </details>

              <dl className="space-y-3 text-[13px] text-stone-700">
                {wholesaleSavingCents > 0 ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-600">Precio catálogo (con IVA)</dt>
                      <dd className="shrink-0 tabular-nums text-stone-500 line-through">
                        {formatCop(catalogListTotalGross)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 text-emerald-800">
                      <dt>
                        Mayorista ({wholesaleDisplayPct}%)
                      </dt>
                      <dd className="shrink-0 font-medium tabular-nums">
                        −{formatCop(wholesaleSavingCents)}
                      </dd>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-600">Subtotal sin IVA</dt>
                  <dd className="shrink-0 tabular-nums text-stone-700">
                    {formatCop(totalNet)}
                  </dd>
                </div>
                {totalVat > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-600">IVA</dt>
                    <dd className="shrink-0 tabular-nums text-stone-700">
                      {formatCop(totalVat)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-b border-stone-300/70 pb-3">
                  <dt className="text-stone-600">Subtotal (con IVA)</dt>
                  <dd className="shrink-0 font-medium tabular-nums text-stone-900">
                    {formatCop(totalGross)}
                  </dd>
                </div>
                <CheckoutShippingTotals />
              </dl>

              <CheckoutSubmitButton className={primaryBtnClass} />
              <Link href="/products" className={secondaryBtnClass}>
                Seguir comprando
              </Link>
            </aside>
          </div>
          </CheckoutShippingProvider>
        </form>
      </div>
    </div>
  );
}
