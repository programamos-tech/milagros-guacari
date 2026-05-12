import Link from "next/link";
import { notFound } from "next/navigation";
import { EditProductForm } from "@/components/admin/EditProductForm";
import { ProductDeleteConfirmForm } from "@/components/admin/ProductDeleteConfirmForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProduct } from "@/app/actions/admin/products";
import type { FragranceRowInitial } from "@/components/admin/ProductFragranceRows";
import type { SizeRowState } from "@/components/admin/ProductSizeRows";
import { normalizeSizeOptionsFromRow, SIZE_UNITS } from "@/lib/product-size-options";
import { storagePublicObjectUrl } from "@/lib/storage-public-url";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ProductRow = {
  name: string;
  description: string;
  reference?: string;
  brand?: string;
  price_cents: number;
  cost_cents?: number;
  cost_gross_cents?: number;
  stock_warehouse?: number;
  stock_local?: number;
  stock_quantity: number;
  image_path: string | null;
  is_published: boolean;
  category_id?: string | null;
  size_options?: unknown;
  size_value?: number | null;
  size_unit?: string | null;
  has_expiration?: boolean | null;
  expiration_date?: string | null;
  colors?: string[] | null;
  fragrance_options?: string[] | null;
  fragrance_option_images?: Record<string, unknown> | null;
  has_vat?: boolean | null;
  vat_percent?: number | null;
};

function fragranceRowsForEditForm(p: ProductRow): FragranceRowInitial[] {
  const imgMap =
    p.fragrance_option_images &&
    typeof p.fragrance_option_images === "object" &&
    !Array.isArray(p.fragrance_option_images)
      ? (p.fragrance_option_images as Record<string, string>)
      : {};
  const lines = Array.isArray(p.fragrance_options)
    ? p.fragrance_options.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      )
    : [];
  if (lines.length === 0) {
    return [{ label: "", existingImagePath: null, previewUrl: null }];
  }
  return lines.map((label) => {
    const raw = imgMap[label];
    const path =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    return {
      label,
      existingImagePath: path,
      previewUrl: path ? storagePublicObjectUrl(path) : null,
    };
  });
}

function sizeRowsForEditForm(p: ProductRow): SizeRowState[] {
  const opts = normalizeSizeOptionsFromRow(p);
  if (opts.length === 0) return [{ value: "", unit: "ml" }];
  return opts.map((o) => {
    const u = o.unit.trim().toLowerCase();
    const unit = (
      SIZE_UNITS as readonly string[]
    ).includes(u)
      ? (u as SizeRowState["unit"])
      : "unidad";
    return { value: String(o.value), unit };
  });
}

function breadcrumbSegment(name: string) {
  const t = name.trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 39)}…`;
}

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdminPermission("productos_editar");
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const supabase = await createSupabaseServerClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("categories")
      .select("id,name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!product) notFound();

  const p = product as ProductRow;
  const cats = categories ?? [];
  const categoryId = p.category_id ?? "";

  const img = storagePublicObjectUrl(p.image_path);
  const boundUpdate = updateProduct.bind(null, id);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/products" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Inventario
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <Link
              href={`/admin/products/${id}`}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              title={p.name}
            >
              {breadcrumbSegment(p.name)}
            </Link>
            <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Editar</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Editar producto
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Modifica los datos del producto. El stock se ajusta desde{" "}
            <Link
              href="/admin/products"
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-zinc-100"
            >
              Actualizar stock
            </Link>{" "}
            en el listado.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/90 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Volver al listado"
        >
          <span className="text-lg leading-none" aria-hidden>
            ←
          </span>
        </Link>
      </div>

      {error ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {error === "rls"
            ? "No tienes permiso para actualizar. Verifica que exista tu fila en public.profiles con rol admin."
            : error === "reference"
              ? "La referencia es obligatoria."
              : error === "name"
                ? "El nombre es obligatorio."
                : "Error al guardar. Aplica la migración de productos si falta, o revisa los logs del servidor."}
        </p>
      ) : null}

      <EditProductForm
        formAction={boundUpdate}
        categories={cats}
        currentImageUrl={img}
        initial={{
          name: p.name,
          reference: p.reference ?? "",
          description: p.description ?? "",
          brand: p.brand ?? "",
          categoryId,
          priceCents: p.price_cents,
          costCents: p.cost_cents ?? 0,
          costGrossCents: p.cost_gross_cents ?? 0,
          stockLocal: p.stock_local ?? 0,
          stockWarehouse: p.stock_warehouse ?? 0,
          isPublished: p.is_published === true,
          sizeRows: sizeRowsForEditForm(p),
          hasExpiration: p.has_expiration === true,
          expirationDate: p.expiration_date ?? "",
          hasVat: p.has_vat === true,
          vatPercent: p.vat_percent ?? null,
          colors: Array.isArray(p.colors) ? p.colors : [],
          fragranceRows: fragranceRowsForEditForm(p),
        }}
      />

      <ProductDeleteConfirmForm
        productId={id}
        productName={p.name}
        className="mt-8 rounded-xl border border-zinc-200/90 bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-none dark:ring-white/[0.06]"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Elimina el producto solo si no debe volver a figurar en el catálogo.
        </p>
      </ProductDeleteConfirmForm>
    </div>
  );
}
