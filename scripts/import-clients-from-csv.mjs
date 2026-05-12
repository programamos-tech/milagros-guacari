#!/usr/bin/env node
/**
 * Importa clientes desde export CSV (legacy) a public.customers + customer_addresses.
 *
 * Uso:
 *   npm run import:clients
 *   node scripts/import-clients-from-csv.mjs /ruta/al/archivo.csv
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

function compactSpaces(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function normalizeEmail(s) {
  const t = compactSpaces(s).toLowerCase();
  return t.length > 0 ? t : null;
}

function documentFromRow(document, documentNumber) {
  const a = compactSpaces(document);
  const b = compactSpaces(documentNumber);
  if (a && b && a !== b) return `${a} ${b}`;
  return a || b || null;
}

function parseTimestamptz(s) {
  const t = compactSpaces(s);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local o export).",
  );
  process.exit(1);
}

const csvArg = process.argv[2]?.trim();
const csvPath = csvArg
  ? resolve(process.cwd(), csvArg)
  : join(root, "clients_rows.csv");

if (!existsSync(csvPath)) {
  console.error(`No existe el CSV: ${csvPath}`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const csvRaw = readFileSync(csvPath, "utf8");
const matrix = parseCsv(csvRaw);

if (matrix.length < 2) {
  console.error("CSV vacío o sin datos.");
  process.exit(1);
}

const headers = matrix[0].map((h) => compactSpaces(h).toLowerCase());
const col = (name) => headers.indexOf(name);

const I = {
  id: col("id"),
  name: col("name"),
  email: col("email"),
  phone: col("phone"),
  document: col("document"),
  document_number: col("document_number"),
  address: col("address"),
  city: col("city"),
  postal_code: col("postal_code"),
  notes: col("notes"),
  created_at: col("created_at"),
  updated_at: col("updated_at"),
  reference_point: col("reference_point"),
};

if (I.id < 0 || I.name < 0) {
  console.error("El CSV debe incluir columnas id y name.");
  process.exit(1);
}

let inserted = 0;
let updated = 0;
let skipped = 0;
let addressesInserted = 0;
const warnings = [];

async function resolveCustomerId(legacyIdStr, email) {
  const legacyOk = UUID_RE.test(legacyIdStr ?? "");

  if (email) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (byEmail?.id) return { id: byEmail.id, reason: "email" };
  }

  if (legacyOk) {
    const { data: byId } = await supabase
      .from("customers")
      .select("id")
      .eq("id", legacyIdStr)
      .maybeSingle();
    if (byId?.id) return { id: byId.id, reason: "id" };
    return { id: legacyIdStr, reason: "new_with_legacy_id" };
  }

  return { id: randomUUID(), reason: "new_generated" };
}

async function ensureAddress(customerId, addressLine, reference) {
  const line = compactSpaces(addressLine);
  const ref = compactSpaces(reference);
  if (!line && !ref) return;

  const { data: existing } = await supabase
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .eq("label", "Principal")
    .eq("address_line", line || "")
    .eq("reference", ref || "")
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await supabase.from("customer_addresses").insert({
    customer_id: customerId,
    label: "Principal",
    address_line: line || "",
    reference: ref || "",
    sort_order: 0,
  });
  if (error) {
    warnings.push(`Dirección no insertada (${customerId}): ${error.message}`);
    return;
  }
  addressesInserted += 1;
}

for (let r = 1; r < matrix.length; r += 1) {
  const row = matrix[r];
  const get = (idx) => (idx >= 0 ? String(row[idx] ?? "") : "");

  const legacyId = compactSpaces(get(I.id));
  const name = compactSpaces(get(I.name));
  if (!name) {
    warnings.push(`Fila ${r + 1}: sin nombre, omitida.`);
    skipped += 1;
    continue;
  }

  const email = normalizeEmail(get(I.email));
  const phone = compactSpaces(get(I.phone)) || null;
  const document_id = documentFromRow(get(I.document), get(I.document_number));
  const shipping_address = compactSpaces(get(I.address)) || null;
  const shipping_city = compactSpaces(get(I.city)) || null;
  const shipping_postal_code = compactSpaces(get(I.postal_code)) || null;
  let notes = compactSpaces(get(I.notes)) || null;
  const created_at = parseTimestamptz(get(I.created_at));
  const updated_at = parseTimestamptz(get(I.updated_at));
  const reference_point = compactSpaces(get(I.reference_point));

  const { id: customerId, reason } = await resolveCustomerId(legacyId, email);

  if (reason === "email" && legacyId && UUID_RE.test(legacyId)) {
    const noteExtra = `Legacy import id: ${legacyId}`;
    notes = notes ? `${notes}\n${noteExtra}` : noteExtra;
  }

  const payload = {
    name,
    email,
    phone,
    document_id,
    shipping_address,
    shipping_city,
    shipping_postal_code,
    notes,
    source: "manual",
    ...(created_at ? { created_at } : {}),
    ...(updated_at ? { updated_at } : {}),
  };

  if (reason === "id" || reason === "email") {
    const { error } = await supabase
      .from("customers")
      .update({
        ...payload,
        updated_at: updated_at ?? new Date().toISOString(),
      })
      .eq("id", customerId);
    if (error) {
      warnings.push(`Fila ${r + 1} (${name}): update falló — ${error.message}`);
      skipped += 1;
      continue;
    }
    updated += 1;
  } else {
    const insertRow = { id: customerId, ...payload };
    const { error } = await supabase.from("customers").insert(insertRow);
    if (error) {
      warnings.push(`Fila ${r + 1} (${name}): insert falló — ${error.message}`);
      skipped += 1;
      continue;
    }
    inserted += 1;
  }

  await ensureAddress(customerId, get(I.address), reference_point);
}

console.log(
  JSON.stringify(
    {
      csvPath,
      inserted,
      updated,
      skipped,
      addressesInserted,
      warnings: warnings.slice(0, 30),
      warningsTotal: warnings.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 30) {
  console.error(
    `\n(Se omitieron ${warnings.length - 30} avisos adicionales en el JSON.)`,
  );
}
