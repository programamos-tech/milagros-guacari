"use server";

import { randomUUID } from "node:crypto";
import { assertActionPermission } from "@/lib/require-admin-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_SUPPLIER_VAT_BPS,
  supplierInvoiceFolioFromIssueDate,
  supplierLineGrossCents,
  supplierLineNetCents,
} from "@/lib/supplier-invoices";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateSupplierPaths(supplierId: string, invoiceId?: string) {
  revalidatePath("/admin/proveedores");
  revalidatePath(`/admin/proveedores/${supplierId}`);
  if (invoiceId) {
    revalidatePath(`/admin/proveedores/${supplierId}/facturas/${invoiceId}`);
  }
}

export async function createSupplierAction(formData: FormData) {
  await assertActionPermission("proveedores_ver");
  const supabase = await createSupabaseServerClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/proveedores/nuevo?error=name");

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim().toLowerCase() || null,
      document_id: String(formData.get("document_id") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error || !data?.id) redirect("/admin/proveedores/nuevo?error=db");
  revalidatePath("/admin/proveedores");
  redirect(`/admin/proveedores/${data.id}`);
}

type ParsedSupplierLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  /** Basis points (1900 = 19 %). Omisión: 1900 en cliente; 0 = sin IVA. */
  vatRateBps?: number;
};

export async function createSupplierInvoiceAction(formData: FormData) {
  await assertActionPermission("proveedores_ver");
  const supabase = await createSupabaseServerClient();
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const issueDateRaw = String(formData.get("issue_date") ?? "").trim().slice(0, 10);
  const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(issueDateRaw)
    ? issueDateRaw
    : new Date().toISOString().slice(0, 10);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const rawPayload = String(formData.get("payload") ?? "").trim();
  const formContext = String(formData.get("form_context") ?? "hub").trim();

  const redirectValidation = () =>
    redirect(
      formContext === "supplier" && supplierId
        ? `/admin/proveedores/${supplierId}/nueva-factura?error=validation`
        : "/admin/proveedores/nueva-factura?error=validation",
    );
  const redirectDb = () =>
    redirect(
      formContext === "supplier" && supplierId
        ? `/admin/proveedores/${supplierId}/nueva-factura?error=db`
        : "/admin/proveedores/nueva-factura?error=db",
    );

  if (!supplierId) redirectValidation();

  let parsed: { lines?: ParsedSupplierLine[] };
  try {
    parsed = JSON.parse(rawPayload) as { lines?: ParsedSupplierLine[] };
  } catch {
    return redirectValidation();
  }
  const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
  if (rawLines.length === 0) redirectValidation();

  const lineRows: {
    product_id: string;
    product_name_snapshot: string;
    quantity: number;
    unit_price_cents: number;
    vat_rate_bps: number;
    sort_order: number;
  }[] = [];
  let totalCents = 0;
  for (let i = 0; i < rawLines.length; i += 1) {
    const l = rawLines[i];
    const pid = String(l?.productId ?? "").trim();
    const name = String(l?.productName ?? "").trim();
    const qty = Math.floor(Number(l?.quantity));
    const unit = Math.floor(Number(l?.unitPriceCents));
    const vatRaw = l?.vatRateBps;
    const vatBps =
      vatRaw === undefined || vatRaw === null || !Number.isFinite(Number(vatRaw))
        ? DEFAULT_SUPPLIER_VAT_BPS
        : Math.max(0, Math.min(10000, Math.floor(Number(vatRaw))));
    if (!pid || !name || qty < 1 || unit < 0) redirectValidation();
    const net = supplierLineNetCents(qty, unit);
    const gross = supplierLineGrossCents(net, vatBps);
    totalCents += gross;
    lineRows.push({
      product_id: pid,
      product_name_snapshot: name,
      quantity: qty,
      unit_price_cents: unit,
      vat_rate_bps: vatBps,
      sort_order: i,
    });
  }
  if (totalCents <= 0) redirectValidation();

  const id = randomUUID();
  const folio = supplierInvoiceFolioFromIssueDate(issueDate, id);

  const { data: ins, error: insErr } = await supabase
    .from("supplier_invoices")
    .insert({
      id,
      supplier_id: supplierId,
      folio,
      total_cents: totalCents,
      issue_date: issueDate,
      notes,
    })
    .select("id")
    .single();

  if (insErr || !ins?.id) return redirectDb();

  const invId = ins.id;
  const insertLines = lineRows.map((r) => ({
    invoice_id: invId,
    product_id: r.product_id,
    product_name_snapshot: r.product_name_snapshot,
    quantity: r.quantity,
    unit_price_cents: r.unit_price_cents,
    vat_rate_bps: r.vat_rate_bps,
    sort_order: r.sort_order,
  }));

  const { error: lineErr } = await supabase.from("supplier_invoice_lines").insert(insertLines);

  if (lineErr) {
    await supabase.from("supplier_invoices").delete().eq("id", invId);
    redirectDb();
  }

  revalidateSupplierPaths(supplierId, invId);
  redirect(`/admin/proveedores/${supplierId}/facturas/${invId}`);
}

export async function registerSupplierInvoicePaymentAction(formData: FormData) {
  await assertActionPermission("proveedores_ver");
  const supabase = await createSupabaseServerClient();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const amount = Math.max(0, Math.floor(Number.parseInt(String(formData.get("amount_cents") ?? "0"), 10) || 0));
  const paymentMethod = String(formData.get("payment_method") ?? "transferencia").trim() || "transferencia";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!invoiceId || !supplierId || amount <= 0) {
    redirect(`/admin/proveedores/${supplierId}?error=abono`);
  }

  const { data: inv } = await supabase
    .from("supplier_invoices")
    .select("id,total_cents,is_cancelled")
    .eq("id", invoiceId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (!inv || inv.is_cancelled) {
    redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=abono`);
  }

  const { data: pays } = await supabase
    .from("supplier_invoice_payments")
    .select("amount_cents")
    .eq("invoice_id", invoiceId);
  const paid = (pays ?? []).reduce((s, r) => s + Number(r.amount_cents ?? 0), 0);
  const total = Number(inv.total_cents ?? 0);
  const pending = Math.max(0, total - paid);
  if (amount > pending) {
    redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=monto`);
  }

  const { error } = await supabase.from("supplier_invoice_payments").insert({
    invoice_id: invoiceId,
    amount_cents: amount,
    payment_method: paymentMethod,
    notes,
  });

  if (error) redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=db`);
  revalidateSupplierPaths(supplierId, invoiceId);
  redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}`);
}

export async function cancelSupplierInvoiceAction(formData: FormData) {
  await assertActionPermission("proveedores_ver");
  const supabase = await createSupabaseServerClient();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  if (!invoiceId || !supplierId) redirect(`/admin/proveedores/${supplierId}?error=cancel`);

  const { error } = await supabase
    .from("supplier_invoices")
    .update({ is_cancelled: true })
    .eq("id", invoiceId)
    .eq("supplier_id", supplierId);

  if (error) redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=db`);
  revalidateSupplierPaths(supplierId, invoiceId);
  redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}`);
}

export async function uploadSupplierInvoiceAttachmentAction(formData: FormData) {
  await assertActionPermission("proveedores_ver");
  const supabase = await createSupabaseServerClient();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const file = formData.get("file");
  if (!invoiceId || !supplierId || !(file instanceof File) || file.size <= 0) {
    redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=archivo`);
  }

  const { data: inv } = await supabase
    .from("supplier_invoices")
    .select("id,is_cancelled")
    .eq("id", invoiceId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (!inv || inv.is_cancelled) {
    redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=archivo`);
  }

  const { count } = await supabase
    .from("supplier_invoice_attachments")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);
  if ((count ?? 0) >= 5) {
    redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=limite`);
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "archivo";
  const storageKey = `${invoiceId}/${Date.now()}-${safeName}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("supplier-invoice-files")
    .upload(storageKey, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (upErr) redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=subida`);

  const storagePath = `supplier-invoice-files/${storageKey}`;
  const { error: insErr } = await supabase.from("supplier_invoice_attachments").insert({
    invoice_id: invoiceId,
    storage_path: storagePath,
    file_name: file.name.slice(0, 200),
    sort_order: count ?? 0,
  });

  if (insErr) {
    await supabase.storage.from("supplier-invoice-files").remove([storageKey]);
    redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}?error=db`);
  }

  revalidateSupplierPaths(supplierId, invoiceId);
  redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}`);
}

export async function deleteSupplierInvoiceAttachmentAction(formData: FormData) {
  await assertActionPermission("proveedores_ver");
  const supabase = await createSupabaseServerClient();
  const attachmentId = String(formData.get("attachment_id") ?? "").trim();
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const storagePath = String(formData.get("storage_path") ?? "").trim();
  if (!attachmentId || !invoiceId || !supplierId || !storagePath) return;

  const { data: row } = await supabase
    .from("supplier_invoice_attachments")
    .select("id")
    .eq("id", attachmentId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (!row) return;

  const key = storagePath.replace(/^supplier-invoice-files\//, "");
  await supabase.storage.from("supplier-invoice-files").remove([key]);
  await supabase.from("supplier_invoice_attachments").delete().eq("id", attachmentId);
  revalidateSupplierPaths(supplierId, invoiceId);
  redirect(`/admin/proveedores/${supplierId}/facturas/${invoiceId}`);
}
