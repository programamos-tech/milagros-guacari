"use server";

import { logAdminActivity } from "@/lib/admin-activity-log";
import {
  clampWholesaleDiscountPercent,
  parseStoreCustomerKind,
} from "@/lib/customer-wholesale-pricing";
import { loadAdminPermissions } from "@/lib/load-admin-permissions";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type QuickStoreCustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document_id: string | null;
};

export type CreateQuickStoreCustomerResult =
  | { ok: true; customer: QuickStoreCustomerRow }
  | { ok: false; code: "auth" | "forbidden" | "name" | "db" };

/** Alta mínima desde POS (sin redirect); para modal en nueva factura. */
export async function createQuickStoreCustomer(input: {
  name: string;
  document_id?: string;
}): Promise<CreateQuickStoreCustomerResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "auth" };

  const perm = await loadAdminPermissions();
  if (!perm?.permissions.clientes_crear) return { ok: false, code: "forbidden" };

  const name = String(input.name ?? "").trim();
  const documentId = String(input.document_id ?? "").trim();
  if (!name) return { ok: false, code: "name" };

  const { data: cust, error: insertErr } = await supabase
    .from("customers")
    .insert({
      name,
      email: null,
      phone: null,
      document_id: documentId || null,
      shipping_address: null,
      shipping_city: null,
      shipping_postal_code: null,
      source: "manual",
    })
    .select("id,name,email,phone,document_id")
    .single();

  if (insertErr || !cust) return { ok: false, code: "db" };

  await logAdminActivity(supabase, {
    actorId: user.id,
    actionType: "customer_created",
    entityType: "customer",
    entityId: (cust as { id: string }).id,
    summary: `Nuevo cliente: ${name}${documentId ? ` · Doc. ${documentId}` : ""}`,
    metadata: {
      source: "pos_quick",
      ...(documentId ? { document_id: documentId } : {}),
    },
  });
  revalidatePath("/admin/actividades");
  revalidatePath("/admin/customers");
  return {
    ok: true,
    customer: cust as QuickStoreCustomerRow,
  };
}

function normEmail(v: string): string | null {
  const t = v.trim().toLowerCase();
  return t ? t : null;
}

function isEmailLike(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** Mayorista: NIT (document_id), correo y teléfono obligatorios. */
function assertWholesaleMandatoryFields(
  customerKind: "retail" | "wholesale",
  documentId: string,
  emailRaw: string,
  phone: string,
  redirectOnError: (code: string) => never,
) {
  if (customerKind !== "wholesale") return;
  const nit = documentId.trim();
  const mail = emailRaw.trim();
  const tel = phone.trim();
  if (!nit || !mail || !tel || !isEmailLike(mail)) {
    redirectOnError("wholesale_required");
  }
}

function wholesaleFieldsFromForm(formData: FormData): {
  customer_kind: "retail" | "wholesale";
  wholesale_discount_percent: number;
} {
  const kind = parseStoreCustomerKind(
    String(formData.get("customer_kind") ?? "").trim(),
  );
  const pctRaw = Number(String(formData.get("wholesale_discount_percent") ?? "0"));
  const pct = clampWholesaleDiscountPercent(pctRaw);
  return {
    customer_kind: kind,
    wholesale_discount_percent: kind === "wholesale" ? pct : 0,
  };
}

type AddressPayload = {
  label: string;
  address_line: string;
  reference: string;
};

export async function createStoreCustomer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("clientes_crear");

  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();

  let addresses: AddressPayload[] = [];
  try {
    const raw = String(formData.get("addresses_payload") ?? "").trim();
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) redirect("/admin/customers/new?error=addresses_invalid");
      addresses = parsed.map((row) => ({
        label: String((row as AddressPayload).label ?? "Casa").trim() || "Casa",
        address_line: String((row as AddressPayload).address_line ?? "").trim(),
        reference: String((row as AddressPayload).reference ?? "").trim(),
      }));
    }
  } catch {
    redirect("/admin/customers/new?error=addresses_invalid");
  }

  const meaningful = addresses.filter(
    (a) => a.address_line.length > 0 || a.reference.length > 0,
  );

  const email = normEmail(emailRaw);
  const { customer_kind, wholesale_discount_percent } =
    wholesaleFieldsFromForm(formData);

  if (!name) redirect("/admin/customers/new?error=name");

  assertWholesaleMandatoryFields(
    customer_kind,
    documentId,
    emailRaw,
    phone,
    (code) => redirect(`/admin/customers/new?error=${code}`),
  );

  if (email) {
    const { data: dup } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (dup) redirect("/admin/customers/new?error=duplicate_email");
  }

  const primary = meaningful[0];
  const shippingAddress = primary
    ? [primary.address_line, primary.reference].filter(Boolean).join("\n\n") || null
    : null;

  const { data: cust, error: insertErr } = await supabase
    .from("customers")
    .insert({
      name,
      email,
      phone: phone || null,
      document_id: documentId || null,
      shipping_address: shippingAddress,
      shipping_city: null,
      shipping_postal_code: null,
      source: "manual",
      customer_kind,
      wholesale_discount_percent,
    })
    .select("id")
    .single();

  if (insertErr || !cust) redirect("/admin/customers/new?error=db");

  const customerId = cust.id as string;

  if (meaningful.length > 0) {
    const rows = meaningful.map((a, i) => ({
      customer_id: customerId,
      label: a.label,
      address_line: a.address_line,
      reference: a.reference,
      sort_order: i,
    }));

    const { error: addrErr } = await supabase.from("customer_addresses").insert(rows);

    if (addrErr) {
      await supabase.from("customers").delete().eq("id", customerId);
      redirect("/admin/customers/new?error=db");
    }
  }

  await logAdminActivity(supabase, {
    actorId: user.id,
    actionType: "customer_created",
    entityType: "customer",
    entityId: customerId,
    summary: `Nuevo cliente: ${name}`,
    metadata: {
      source: "form",
      customer_kind,
      wholesale_discount_percent,
      ...(documentId ? { document_id: documentId } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    },
  });
  revalidatePath("/admin/actividades");
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export async function updateStoreCustomer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("clientes_editar");

  const customerId = String(formData.get("customer_id") ?? "").trim();
  if (!customerId) redirect("/admin/customers");

  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();

  let addresses: AddressPayload[] = [];
  try {
    const raw = String(formData.get("addresses_payload") ?? "").trim();
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        redirect(`/admin/customers/${customerId}/edit?error=addresses_invalid`);
      }
      addresses = parsed.map((row) => ({
        label: String((row as AddressPayload).label ?? "Casa").trim() || "Casa",
        address_line: String((row as AddressPayload).address_line ?? "").trim(),
        reference: String((row as AddressPayload).reference ?? "").trim(),
      }));
    }
  } catch {
    redirect(`/admin/customers/${customerId}/edit?error=addresses_invalid`);
  }

  const meaningful = addresses.filter(
    (a) => a.address_line.length > 0 || a.reference.length > 0,
  );

  const email = normEmail(emailRaw);
  const { customer_kind, wholesale_discount_percent } =
    wholesaleFieldsFromForm(formData);

  if (!name) {
    redirect(`/admin/customers/${customerId}/edit?error=name`);
  }

  assertWholesaleMandatoryFields(
    customer_kind,
    documentId,
    emailRaw,
    phone,
    (code) => redirect(`/admin/customers/${customerId}/edit?error=${code}`),
  );

  if (email) {
    const { data: dup } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .neq("id", customerId)
      .maybeSingle();
    if (dup) {
      redirect(`/admin/customers/${customerId}/edit?error=duplicate_email`);
    }
  }

  const primary = meaningful[0];
  const shippingAddress = primary
    ? [primary.address_line, primary.reference].filter(Boolean).join("\n\n") || null
    : null;

  const { error: upErr } = await supabase
    .from("customers")
    .update({
      name,
      email,
      phone: phone || null,
      document_id: documentId || null,
      shipping_address: shippingAddress,
      customer_kind,
      wholesale_discount_percent,
    })
    .eq("id", customerId);

  if (upErr) {
    redirect(`/admin/customers/${customerId}/edit?error=db`);
  }

  const { error: delErr } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("customer_id", customerId);

  if (delErr) {
    redirect(`/admin/customers/${customerId}/edit?error=db`);
  }

  if (meaningful.length > 0) {
    const rows = meaningful.map((a, i) => ({
      customer_id: customerId,
      label: a.label,
      address_line: a.address_line,
      reference: a.reference,
      sort_order: i,
    }));

    const { error: addrErr } = await supabase.from("customer_addresses").insert(rows);

    if (addrErr) {
      redirect(`/admin/customers/${customerId}/edit?error=db`);
    }
  }

  await logAdminActivity(supabase, {
    actorId: user.id,
    actionType: "customer_updated",
    entityType: "customer",
    entityId: customerId,
    summary: `Cliente actualizado: ${name}`,
    metadata: {
      customer_kind,
      wholesale_discount_percent,
      ...(documentId ? { document_id: documentId } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    },
  });
  revalidatePath("/admin/actividades");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}`);
}

export async function deleteCustomerById(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  await assertActionPermission("clientes_editar");

  const id = customerId.trim();
  if (!id) redirect("/admin/customers");

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    redirect(`/admin/customers/${id}?error=delete`);
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export async function deleteCustomerAction(formData: FormData) {
  await deleteCustomerById(String(formData.get("customer_id") ?? ""));
}
