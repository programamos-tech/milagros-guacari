import { cache } from "react";
import { withTimeout } from "@/lib/async-timeout";
import {
  mergePermissionsWithDefaults,
  normalizeCollaboratorJobRole,
  type PermissionMap,
} from "@/lib/admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_AUTH_TIMEOUT_MS = 12_000;

async function loadAdminPermissionsUncached(): Promise<{
  userId: string;
  permissions: PermissionMap;
} | null> {
  const supabase = await createSupabaseServerClient();
  const authResult = (await withTimeout(
    supabase.auth.getUser(),
    ADMIN_AUTH_TIMEOUT_MS,
  )) as Awaited<ReturnType<typeof supabase.auth.getUser>> | null;
  const user = authResult?.data.user ?? null;
  if (!user) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("permissions, job_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return null;

  const jobRole = normalizeCollaboratorJobRole(row.job_role as string | null);
  const permissions = mergePermissionsWithDefaults(
    row.permissions as PermissionMap | null,
    jobRole,
  );

  return { userId: user.id, permissions };
}

/** Una sola lectura de perfil por request (layout + página + permisos de sección). */
export const loadAdminPermissions = cache(loadAdminPermissionsUncached);
