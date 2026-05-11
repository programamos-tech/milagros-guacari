import { normalizeDocumentIdForMatch } from "@/lib/normalize-document-id";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export { normalizeDocumentIdForMatch } from "@/lib/normalize-document-id";

async function linkCustomerRow(
  sb: ReturnType<typeof createSupabaseServiceClient>,
  rowId: string,
  userId: string,
  emailLc: string,
  displayName: string | null | undefined,
  docNorm: string | null,
  row: {
    name?: string | null;
    auth_user_id?: string | null;
    document_id?: string | null;
  },
): Promise<string | null> {
  if (row.auth_user_id && row.auth_user_id !== userId) {
    return null;
  }

  const nameTrim = displayName?.trim();
  const patch: Record<string, unknown> = { auth_user_id: userId };

  if (nameTrim && !row.name?.trim()) {
    patch.name = nameTrim;
  }
  if (emailLc) {
    patch.email = emailLc;
  }
  if (docNorm) {
    const existingNorm = normalizeDocumentIdForMatch(row.document_id);
    if (!existingNorm || existingNorm === docNorm) {
      patch.document_id = docNorm;
    }
  }

  const { error } = await sb.from("customers").update(patch).eq("id", rowId);

  if (
    error &&
    (error.code === "23505" ||
      error.message?.toLowerCase().includes("duplicate") ||
      error.message?.toLowerCase().includes("unique"))
  ) {
    const { error: e2 } = await sb
      .from("customers")
      .update({ auth_user_id: userId })
      .eq("id", rowId);
    if (e2) {
      if (process.env.NODE_ENV === "development") {
        console.error("[linkCustomerRow] fallback", e2.message);
      }
      return null;
    }
    return rowId;
  }

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[linkCustomerRow]", error.message);
    }
    return null;
  }

  return rowId;
}

/**
 * Idempotent: fila en `customers` con `auth_user_id`.
 * Prioridad: 1) ya vinculado 2) mismo documento (manual/POS) 3) mismo email 4) insert.
 */
export async function ensureStoreCustomerLinked(
  userId: string,
  email: string | undefined,
  displayName?: string | null,
  documentRaw?: string | null,
): Promise<string | null> {
  const sb = createSupabaseServiceClient();
  const emailLc = (email ?? "").toLowerCase().trim();
  if (!emailLc) {
    return null;
  }

  const docNorm = normalizeDocumentIdForMatch(documentRaw);

  const { data: existingAuth } = await sb
    .from("customers")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (existingAuth?.id) {
    return existingAuth.id as string;
  }

  if (docNorm) {
    const { data: docCustomerId, error: rpcErr } = await sb.rpc(
      "find_customer_id_by_document_normalized",
      { p_normalized: docNorm },
    );

    if (rpcErr && process.env.NODE_ENV === "development") {
      console.error("[ensureStoreCustomerLinked] rpc doc", rpcErr.message);
    }

    const cid =
      typeof docCustomerId === "string"
        ? docCustomerId
        : docCustomerId != null
          ? String(docCustomerId)
          : null;

    if (cid) {
      const { data: docRow } = await sb
        .from("customers")
        .select("id, name, email, auth_user_id, document_id")
        .eq("id", cid)
        .maybeSingle();

      if (docRow?.id) {
        const linked = await linkCustomerRow(
          sb,
          docRow.id,
          userId,
          emailLc,
          displayName,
          docNorm,
          docRow,
        );
        if (linked) {
          return linked;
        }
        return null;
      }
    }
  }

  const { data: byEmail } = await sb
    .from("customers")
    .select("id, name, email, auth_user_id, document_id")
    .eq("email", emailLc)
    .maybeSingle();

  if (byEmail?.id) {
    const linked = await linkCustomerRow(
      sb,
      byEmail.id,
      userId,
      emailLc,
      displayName,
      docNorm,
      byEmail,
    );
    if (linked) {
      return linked;
    }
    return null;
  }

  const nameTrim = displayName?.trim() || "Cliente";
  const { data: inserted, error } = await sb
    .from("customers")
    .insert({
      name: nameTrim,
      email: emailLc,
      source: "storefront",
      auth_user_id: userId,
      document_id: docNorm ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ensureStoreCustomerLinked] insert", error?.message);
    }
    return null;
  }

  return inserted.id as string;
}
