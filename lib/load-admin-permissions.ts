import {
  mergePermissionsWithDefaults,
  normalizeCollaboratorJobRole,
  type PermissionMap,
} from "@/lib/admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loadAdminPermissions(): Promise<{
  userId: string;
  permissions: PermissionMap;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
