import {
  NewCollaboraboratorForm,
  NewCollaboratorHeader,
} from "@/components/admin/NewCollaboraboratorForm";
import { storeBrand } from "@/lib/brand";
import { requireAdminPermission } from "@/lib/require-admin-permission";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "validation":
      return "Revisa nombre, usuario, correo y contraseña (mín. 6).";
    case "duplicate_email":
      return "Ese correo ya está registrado en Auth.";
    case "duplicate_username":
      return "Ese usuario corto ya está en uso.";
    case "no_service":
      return "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios (solo entorno seguro).";
    case "db":
      return "No se pudo guardar. Revisa logs y permisos.";
    default:
      return "No se pudo crear el colaborador.";
  }
}

export default async function AdminNuevoColaboradorPage({ searchParams }: Props) {
  await requireAdminPermission("colaboradores_gestionar");
  const sp = await searchParams;
  const err = typeof sp.error === "string" ? sp.error : undefined;
  const banner = errorMessage(err);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <NewCollaboratorHeader />
      {banner ? (
        <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
          {banner}
        </p>
      ) : null}
      <NewCollaboraboratorForm mode="create" storeLabel={storeBrand} />
    </div>
  );
}
