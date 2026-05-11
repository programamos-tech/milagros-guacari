"use server";

import {
  normalizePermissions,
  type CollaboratorJobRole,
  type PermissionMap,
} from "@/lib/admin-permissions";
import { slugUsername } from "@/lib/collaborator-utils";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function redirectNewError(code: string): never {
  redirect(`/admin/usuarios/nuevo?error=${encodeURIComponent(code)}`);
}

export async function inviteCollaboratorAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!myProfile) redirect("/admin/login?error=no_profile");
  await assertActionPermission("colaboradores_gestionar");

  let service: ReturnType<typeof createSupabaseServiceClient>;
  try {
    service = createSupabaseServiceClient();
  } catch {
    redirectNewError("no_service");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const loginUsernameRaw = String(formData.get("login_username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const jobRole = String(formData.get("job_role") ?? "cashier") as CollaboratorJobRole;
  const branchLabelRaw = String(formData.get("branch_label") ?? "").trim();
  const branchLabel = branchLabelRaw.length > 0 ? branchLabelRaw : null;
  const avatarVariant = String(formData.get("avatar_variant") ?? "A").trim().slice(0, 1) || "A";

  let permissions: PermissionMap = {};
  try {
    const raw = String(formData.get("permissions_json") ?? "").trim();
    if (raw) {
      permissions = normalizePermissions(JSON.parse(raw) as unknown);
    }
  } catch {
    redirectNewError("validation");
  }

  if (!displayName || !email || !password || password.length < 6) {
    redirectNewError("validation");
  }
  if (jobRole !== "owner" && jobRole !== "cashier" && jobRole !== "support") {
    redirectNewError("validation");
  }

  const loginUsername = (loginUsernameRaw || slugUsername(displayName)).toLowerCase();

  const { data: dupUser } = await service
    .from("profiles")
    .select("id")
    .eq("login_username", loginUsername)
    .maybeSingle();
  if (dupUser) redirectNewError("duplicate_username");

  const { data: created, error: cErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      login_username: loginUsername,
    },
  });

  if (cErr || !created.user) {
    const msg = (cErr?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      redirectNewError("duplicate_email");
    }
    redirectNewError("db");
  }

  const uid = created.user.id;

  const { error: pErr } = await service.from("profiles").insert({
    id: uid,
    role: "admin",
    display_name: displayName,
    login_username: loginUsername,
    public_email: email,
    job_role: jobRole,
    branch_label: branchLabel,
    permissions: permissions as object,
    avatar_variant: avatarVariant,
    is_active: true,
  });

  if (pErr) {
    await service.auth.admin.deleteUser(uid);
    redirectNewError("db");
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

function redirectEditError(id: string, code: string): never {
  redirect(`/admin/usuarios/${id}/edit?error=${encodeURIComponent(code)}`);
}

export async function updateCollaboratorAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!myProfile) redirect("/admin/login?error=no_profile");
  await assertActionPermission("colaboradores_gestionar");

  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!profileId) redirect("/admin/usuarios");

  let service: ReturnType<typeof createSupabaseServiceClient>;
  try {
    service = createSupabaseServiceClient();
  } catch {
    redirectEditError(profileId, "no_service");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const loginUsername = String(formData.get("login_username") ?? "").trim().toLowerCase();
  const jobRole = String(formData.get("job_role") ?? "cashier") as CollaboratorJobRole;
  const branchLabelRaw = String(formData.get("branch_label") ?? "").trim();
  const branchLabel = branchLabelRaw.length > 0 ? branchLabelRaw : null;
  const avatarVariant = String(formData.get("avatar_variant") ?? "A").trim().slice(0, 1) || "A";
  const isActive = String(formData.get("is_active") ?? "true") === "true";
  const password = String(formData.get("password") ?? "");

  let permissions: PermissionMap = {};
  try {
    const raw = String(formData.get("permissions_json") ?? "").trim();
    if (raw) {
      permissions = normalizePermissions(JSON.parse(raw) as unknown);
    }
  } catch {
    redirectEditError(profileId, "validation");
  }

  if (!displayName || !loginUsername) {
    redirectEditError(profileId, "validation");
  }
  if (jobRole !== "owner" && jobRole !== "cashier" && jobRole !== "support") {
    redirectEditError(profileId, "validation");
  }

  const { data: other } = await service
    .from("profiles")
    .select("id")
    .eq("login_username", loginUsername)
    .neq("id", profileId)
    .maybeSingle();
  if (other) redirectEditError(profileId, "duplicate_username");

  const { error: uErr } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      login_username: loginUsername,
      job_role: jobRole,
      branch_label: branchLabel,
      permissions: permissions as object,
      avatar_variant: avatarVariant,
      is_active: isActive,
    })
    .eq("id", profileId);

  if (uErr) redirectEditError(profileId, "db");

  if (password.length >= 6) {
    const { error: pwErr } = await service.auth.admin.updateUserById(profileId, {
      password,
    });
    if (pwErr) redirectEditError(profileId, "db");
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${profileId}/edit`);
  redirect("/admin/usuarios");
}
