"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ALLOWED_NEXT = new Set<string>(["/cuenta", "/cuenta/direcciones"]);

function safeNext(formData: FormData): string {
  const raw = String(formData.get("next") ?? "").trim();
  return ALLOWED_NEXT.has(raw) ? raw : "/cuenta";
}

function parseBirthDate(raw: string): string | null {
  const s = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const now = new Date();
  if (y < 1900 || y > now.getUTCFullYear()) return null;
  if (d.getTime() > now.getTime()) return null;
  return s;
}

export async function updateStoreCustomerBirthDateAction(formData: FormData) {
  const next = safeNext(formData);
  const raw = String(formData.get("birth_date") ?? "");
  const birthDate = parseBirthDate(raw);
  if (!birthDate) {
    redirect(`${next}?cumple=invalid`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect("/cuenta/entrar");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) {
    redirect(`${next}?cumple=forbidden`);
  }

  const { error } = await supabase
    .from("customers")
    .update({ birth_date: birthDate })
    .eq("auth_user_id", user.id);

  if (error) {
    redirect(`${next}?cumple=db`);
  }

  revalidatePath("/cuenta");
  revalidatePath("/cuenta/direcciones");
  redirect(`${next}?cumple=ok`);
}
