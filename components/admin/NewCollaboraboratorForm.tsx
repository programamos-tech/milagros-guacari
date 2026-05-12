"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  inviteCollaboratorAction,
  updateCollaboratorAction,
} from "@/app/actions/admin/collaborators";
import { CustomerAvatar } from "@/components/admin/CustomerAvatar";
import { useAdminTheme } from "@/components/admin/AdminThemeProvider";
import {
  productInputClass as inputClass,
  productLabelClass as labelClass,
  productSectionTitle as sectionTitle,
} from "@/components/admin/product-form-primitives";
import {
  mergePermissionsWithDefaults,
  permissionsFromRoleTemplate,
  PERMISSION_MODULES,
  type CollaboratorJobRole,
  type PermissionKey,
  type PermissionMap,
} from "@/lib/admin-permissions";
import { slugUsername } from "@/lib/collaborator-utils";

/** Superficie de formulario alineada con `data-admin-theme` (no solo `color-scheme`). */
function collaboratorFormCardShell(resolved: "light" | "dark"): string {
  return resolved === "dark"
    ? "rounded-2xl border border-zinc-700/90 bg-zinc-900 shadow-none ring-1 ring-white/[0.06]"
    : "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5";
}

const AVATAR_VARIANTS = ["A", "B", "C", "D"] as const;

export type CollaboratorInitial = {
  profileId: string;
  display_name: string | null;
  login_username: string | null;
  public_email: string | null;
  job_role: CollaboratorJobRole;
  avatar_variant: string | null;
  permissions: PermissionMap | null;
  is_active: boolean;
};

export function NewCollaboratorHeader() {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/usuarios" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Equipo
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Nuevo colaborador</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Nuevo colaborador
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Registra un colaborador: foto, nombre y usuario corto para acceso al sistema.
        </p>
      </div>
      <Link
        href="/admin/usuarios"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver al listado"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

export function EditCollaboratorHeader({ name }: { name: string }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/usuarios" className="hover:text-zinc-800 dark:hover:text-zinc-200">
            Equipo
          </Link>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Editar</span>
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
          Editar colaborador
        </h1>
        <p className="mt-2 max-w-2xl break-words text-sm text-zinc-500 dark:text-zinc-400">
          {name}
        </p>
      </div>
      <Link
        href="/admin/usuarios"
        className="inline-flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:self-auto"
        aria-label="Volver al listado"
      >
        <span className="text-lg leading-none" aria-hidden>
          ←
        </span>
      </Link>
    </div>
  );
}

function roleLabel(role: CollaboratorJobRole) {
  if (role === "owner") return "Dueño";
  if (role === "support") return "Apoyo";
  return "Cajero";
}

type Props = {
  mode: "create" | "edit";
  storeLabel: string;
  initial?: CollaboratorInitial;
};

export function NewCollaboraboratorForm({ mode, storeLabel, initial }: Props) {
  const adminTheme = useAdminTheme();
  const cardShell = collaboratorFormCardShell(adminTheme?.resolved ?? "light");

  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [loginUsername, setLoginUsername] = useState(initial?.login_username ?? "");
  const [usernameTouched, setUsernameTouched] = useState(mode === "edit");
  const [email, setEmail] = useState(initial?.public_email ?? "");
  const [password, setPassword] = useState("");
  const [jobRole, setJobRole] = useState<CollaboratorJobRole>(initial?.job_role ?? "cashier");
  const [avatarVariant, setAvatarVariant] = useState(
    (initial?.avatar_variant ?? "A").slice(0, 1).toUpperCase() || "A",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [permissions, setPermissions] = useState<PermissionMap>(() =>
    mergePermissionsWithDefaults(
      initial?.permissions ?? undefined,
      initial?.job_role ?? "cashier",
    ),
  );

  useEffect(() => {
    if (mode === "edit" || usernameTouched) return;
    setLoginUsername(slugUsername(displayName));
  }, [displayName, mode, usernameTouched]);

  const avatarSeed = useMemo(() => {
    const base = (email || displayName || "nuevo").trim().toLowerCase();
    return `${base}:av:${avatarVariant}`;
  }, [email, displayName, avatarVariant]);

  const payloadJson = useMemo(() => JSON.stringify(permissions), [permissions]);

  const summaryName = displayName.trim() || "—";
  const summaryUser = loginUsername.trim() || "—";
  const summaryRole = roleLabel(jobRole);

  function togglePermission(key: PermissionKey, readOnly?: boolean) {
    if (readOnly) return;
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  }

  function restoreByRole() {
    setPermissions(permissionsFromRoleTemplate(jobRole));
  }

  const canSubmitCreate =
    displayName.trim().length > 0 &&
    loginUsername.trim().length > 0 &&
    email.includes("@") &&
    password.length >= 6;

  const canSubmitEdit =
    displayName.trim().length > 0 &&
    loginUsername.trim().length > 0 &&
    (password.length === 0 || password.length >= 6);

  const canSubmit = mode === "create" ? canSubmitCreate : canSubmitEdit;

  return (
    <form
      action={mode === "create" ? inviteCollaboratorAction : updateCollaboratorAction}
      className="space-y-6"
    >
      {mode === "edit" && initial ? (
        <input type="hidden" name="profile_id" value={initial.profileId} readOnly />
      ) : null}
      <input type="hidden" name="permissions_json" value={payloadJson} readOnly />

      <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className={`${cardShell} p-4 sm:p-6`}>
            <h2 className={sectionTitle}>Datos del colaborador</h2>

            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="min-w-0 shrink-0">
                <p className={labelClass}>Avatar</p>
                <div className="mt-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <CustomerAvatar
                    seed={avatarSeed}
                    size={72}
                    className="shadow-md ring-2 ring-zinc-200/90 dark:ring-zinc-600"
                    label="Avatar del colaborador"
                  />
                  <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <label className="sr-only" htmlFor="avatar-variant">
                      Variante de personaje
                    </label>
                    <select
                      id="avatar-variant"
                      name="avatar_variant"
                      value={avatarVariant}
                      onChange={(e) => setAvatarVariant(e.target.value.slice(0, 1).toUpperCase())}
                      className={inputClass}
                    >
                      {AVATAR_VARIANTS.map((v) => (
                        <option key={v} value={v}>
                          Personaje {v}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Personaje generado (DiceBear). Elige una variante; se guarda con la cuenta.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="display_name" className={labelClass}>
                  Nombre completo <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej. María López"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="login_username" className={labelClass}>
                  Usuario (acceso) <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="login_username"
                  name="login_username"
                  required
                  value={loginUsername}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    setLoginUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
                  }}
                  placeholder="Ej. mlopez"
                  autoComplete="username"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Generado automáticamente desde el nombre. Corto y sin espacios.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className={labelClass}>
                  Correo <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                {mode === "create" ? (
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej. maria@tienda.com"
                    autoComplete="email"
                    className={inputClass}
                  />
                ) : (
                  <>
                    <input
                      id="email"
                      type="email"
                      readOnly
                      value={email}
                      className={`${inputClass} bg-zinc-50 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300`}
                    />
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      El correo de acceso no se puede cambiar desde aquí.
                    </p>
                  </>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="password" className={labelClass}>
                  {mode === "create" ? (
                    <>
                      Contraseña inicial <span className="text-red-600 dark:text-red-400">*</span>
                    </>
                  ) : (
                    "Nueva contraseña (opcional)"
                  )}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required={mode === "create"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "create" ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiar"}
                  autoComplete="new-password"
                  className={inputClass}
                  minLength={mode === "create" ? 6 : undefined}
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {mode === "create"
                    ? "El colaborador podrá cambiarla al iniciar sesión."
                    : "Solo se actualiza si escribís al menos 6 caracteres."}
                </p>
              </div>
              <div>
                <label htmlFor="job_role" className={labelClass}>
                  Rol
                </label>
                <select
                  id="job_role"
                  name="job_role"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value as CollaboratorJobRole)}
                  className={inputClass}
                >
                  <option value="owner">Dueño</option>
                  <option value="cashier">Cajero</option>
                  <option value="support">Apoyo</option>
                </select>
              </div>
              {mode === "edit" ? (
                <div className="flex items-center gap-3 sm:col-span-2">
                  <input
                    type="hidden"
                    name="is_active"
                    value={isActive ? "true" : "false"}
                    readOnly
                  />
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Colaborador activo
                  </label>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:col-span-1 xl:self-start">
          <section className={`${cardShell} p-4 sm:p-6`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <h2 className={`${sectionTitle} min-w-0`}>Permisos</h2>
              <button
                type="button"
                onClick={restoreByRole}
                className="shrink-0 self-start text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400 sm:self-auto"
              >
                Restaurar por rol
              </button>
            </div>
            <div className="mt-4 max-h-[min(28rem,55vh)] min-w-0 space-y-6 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
              {PERMISSION_MODULES.map((mod) => (
                <div key={mod.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                    {mod.label}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {mod.items.map((item) => (
                      <label
                        key={item.key}
                        className={`flex min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${item.readOnly ? "opacity-80" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(permissions[item.key])}
                          onChange={() => togglePermission(item.key, item.readOnly)}
                          disabled={item.readOnly}
                          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900"
                        />
                        <span className="min-w-0 break-words text-sm leading-snug text-zinc-800 dark:text-zinc-200">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${cardShell} p-4 sm:p-6`}>
            <h2 className={sectionTitle}>Resumen</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <dt className="text-zinc-500 dark:text-zinc-400">Colaborador</dt>
                <dd className="max-w-[58%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {summaryName}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <dt className="text-zinc-500 dark:text-zinc-400">Usuario</dt>
                <dd className="max-w-[58%] truncate text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {summaryUser}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500 dark:text-zinc-400">Rol</dt>
                <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {summaryRole}
                </dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 w-full rounded-lg border border-rose-950 bg-rose-950 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-900 hover:border-rose-900 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              {mode === "create" ? "Crear colaborador" : "Guardar cambios"}
            </button>
          </section>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">{storeLabel}</p>
        </div>
      </div>
    </form>
  );
}
