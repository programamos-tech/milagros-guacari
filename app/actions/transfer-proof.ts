"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const BUCKET = "order-payment-proofs";
const WINDOW_MS = 2 * 60 * 1000;
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function extFromMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return null;
}

export type TransferProofActionResult =
  | { ok: true; deadlineIso: string }
  | { ok: false; error: string };

export async function openTransferProofUploadWindow(
  orderId: string,
  token: string,
): Promise<TransferProofActionResult> {
  const tid = token.trim();
  if (!orderId || !tid) {
    return { ok: false, error: "Datos incompletos." };
  }

  const supabase = createSupabaseServiceClient();
  const { data: row, error } = await supabase
    .from("orders")
    .select("id, checkout_payment_method, transfer_session_token, status")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Pedido no encontrado." };
  }
  if (String(row.checkout_payment_method) !== "transfer") {
    return { ok: false, error: "Este pedido no admite comprobante por transferencia." };
  }
  if (String(row.transfer_session_token) !== tid) {
    return { ok: false, error: "Enlace inválido o vencido." };
  }
  if (String(row.status) !== "pending") {
    return { ok: false, error: "Este pedido ya no está pendiente de pago." };
  }

  const deadline = new Date(Date.now() + WINDOW_MS).toISOString();
  const { error: uErr } = await supabase
    .from("orders")
    .update({ transfer_upload_deadline_at: deadline })
    .eq("id", orderId)
    .eq("transfer_session_token", tid);

  if (uErr) {
    return { ok: false, error: "No se pudo abrir la ventana de subida." };
  }

  return { ok: true, deadlineIso: deadline };
}

export type UploadTransferProofResult =
  | { ok: true }
  | { ok: false; error: string };

export async function getTransferProofDeadline(
  orderId: string,
  token: string,
): Promise<{ deadlineIso: string | null } | { error: string }> {
  const tid = token.trim();
  if (!orderId || !tid) return { error: "Datos incompletos." };

  const supabase = createSupabaseServiceClient();
  const { data: row, error } = await supabase
    .from("orders")
    .select(
      "transfer_session_token, transfer_upload_deadline_at, checkout_payment_method, status",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !row) return { error: "Pedido no encontrado." };
  if (String(row.transfer_session_token) !== tid) return { error: "Enlace inválido." };
  if (String(row.checkout_payment_method) !== "transfer") {
    return { error: "Pedido no válido." };
  }
  if (String(row.status) !== "pending") {
    return { deadlineIso: null };
  }

  const d = row.transfer_upload_deadline_at as string | null;
  if (!d) return { deadlineIso: null };
  if (new Date(d).getTime() <= Date.now()) return { deadlineIso: null };
  return { deadlineIso: d };
}

export async function uploadTransferProof(
  _prev: UploadTransferProofResult | null,
  formData: FormData,
): Promise<UploadTransferProofResult> {
  const orderId = String(formData.get("orderId") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const tid = token.trim();
  if (!orderId || !tid) {
    return { ok: false, error: "Datos incompletos." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecciona un archivo." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "El archivo supera 5 MB." };
  }
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) {
    return { ok: false, error: "Solo se permiten JPG, PNG, WebP o PDF." };
  }
  const ext = extFromMime(mime);
  if (!ext) {
    return { ok: false, error: "Tipo de archivo no admitido." };
  }

  const supabase = createSupabaseServiceClient();
  const { data: row, error } = await supabase
    .from("orders")
    .select(
      "id, checkout_payment_method, transfer_session_token, status, transfer_upload_deadline_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Pedido no encontrado." };
  }
  if (String(row.checkout_payment_method) !== "transfer") {
    return { ok: false, error: "Este pedido no admite comprobante por transferencia." };
  }
  if (String(row.transfer_session_token) !== tid) {
    return { ok: false, error: "Enlace inválido." };
  }
  if (String(row.status) !== "pending") {
    return { ok: false, error: "Este pedido ya no está pendiente de pago." };
  }

  const deadlineRaw = row.transfer_upload_deadline_at as string | null;
  if (!deadlineRaw) {
    return { ok: false, error: "Primero abre la ventana de subida (2 minutos)." };
  }
  const deadlineMs = new Date(deadlineRaw).getTime();
  if (!Number.isFinite(deadlineMs) || Date.now() > deadlineMs) {
    return {
      ok: false,
      error: "Se acabó el tiempo. Habilita de nuevo la subida e intenta otra vez.",
    };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const objectPath = `${orderId}/${randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) {
    if (process.env.NODE_ENV === "development") {
      console.error("[transfer-proof] storage upload:", upErr.message);
    }
    return { ok: false, error: "No se pudo guardar el archivo. Intenta de nuevo." };
  }

  const { error: insErr } = await supabase.from("order_transfer_proofs").insert({
    order_id: orderId,
    storage_path: objectPath,
    original_filename: file.name?.slice(0, 240) || null,
  });

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    return { ok: false, error: "No se pudo registrar el comprobante." };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/ventas");

  return { ok: true };
}
