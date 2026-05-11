"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MIN_PASSWORD_LENGTH = 8;

export async function updateAdminAccountPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect(
      `/admin/cuenta?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")}`,
    );
  }
  if (password !== confirm) {
    redirect(
      `/admin/cuenta?error=${encodeURIComponent("Las contraseñas no coinciden.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/admin/cuenta?error=${encodeURIComponent(
        "No se pudo actualizar la contraseña. Intenta de nuevo o cierra sesión y vuelve a entrar.",
      )}`,
    );
  }

  revalidatePath("/admin/cuenta");
  redirect("/admin/cuenta?ok=1");
}
