#!/usr/bin/env node
/**
 * Importa egresos desde expenses_rows.csv → public.store_expenses.
 *
 * - Solo filas con status `active` (omite cancelados / pruebas).
 * - `amount` del CSV = pesos COP enteros (misma convención que `amount_cents` en la app).
 * - `concept` = categoría legible del CSV; `category` = `legacy` (origen CSV).
 * - payment_method: cash → efectivo, transfer → transferencia; resto → otro.
 *
 * Uso:
 *   npm run import:expenses
 *   node scripts/import-expenses-from-csv.mjs /ruta/expenses_rows.csv
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */

import { createClient } from "@supabase/supabase-js";
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

function parseMoneyInt(s) {
  const t = compactSpaces(s).replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function parseDateYmd(s) {
  const t = compactSpaces(s);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function parseTimestamptz(s) {
  const t = compactSpaces(s);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapPaymentMethod(raw) {
  const k = compactSpaces(raw).toLowerCase();
  if (k === "cash" || k === "efectivo") return "efectivo";
  if (k === "transfer" || k === "transferencia") return "transferencia";
  if (k === "card" || k === "tarjeta") return "tarjeta";
  return "otro";
}

function isActiveStatus(raw) {
  return compactSpaces(raw).toLowerCase() === "active";
}

function isTruthyFlag(raw) {
  const t = compactSpaces(String(raw)).toLowerCase();
  return t === "true" || t === "t" || t === "1" || t === "yes";
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
const csvPath = csvArg ? resolve(process.cwd(), csvArg) : join(root, "expenses_rows.csv");

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
  category: col("category"),
  amount: col("amount"),
  date: col("date"),
  payment_method: col("payment_method"),
  notes: col("notes"),
  created_at: col("created_at"),
  status: col("status"),
  includes_vat: col("includes_vat"),
};

for (const [k, v] of Object.entries(I)) {
  if (v < 0) {
    console.error(`Falta columna requerida en el CSV: ${k}`);
    process.exit(1);
  }
}

let inserted = 0;
let updated = 0;
let skippedCancelled = 0;
let skippedInvalid = 0;
const warnings = [];

for (let r = 1; r < matrix.length; r += 1) {
  const row = matrix[r];
  const get = (idx) => (idx >= 0 && idx < row.length ? row[idx] : "");

  const id = compactSpaces(get(I.id));
  if (!UUID_RE.test(id)) {
    warnings.push(`Fila ${r + 1}: id inválido, se omite.`);
    skippedInvalid += 1;
    continue;
  }

  if (!isActiveStatus(get(I.status))) {
    skippedCancelled += 1;
    continue;
  }

  const amount = parseMoneyInt(get(I.amount));
  if (amount === null || amount <= 0) {
    warnings.push(`Fila ${r + 1}: monto inválido, se omite.`);
    skippedInvalid += 1;
    continue;
  }

  const expenseDate = parseDateYmd(get(I.date));
  if (!expenseDate) {
    warnings.push(`Fila ${r + 1}: fecha inválida, se omite.`);
    skippedInvalid += 1;
    continue;
  }

  const conceptRaw = compactSpaces(get(I.category));
  const concept = conceptRaw.length > 0 ? conceptRaw : "Egreso";

  let notes = compactSpaces(get(I.notes));
  if (isTruthyFlag(get(I.includes_vat))) {
    notes =
      notes.length > 0
        ? `${notes}\n[Monto con IVA según registro origen.]`
        : "[Monto con IVA según registro origen.]";
  }
  const notesOut = notes.length > 0 ? notes : null;

  const payment_method = mapPaymentMethod(get(I.payment_method));
  const created_at = parseTimestamptz(get(I.created_at));

  const payload = {
    id,
    concept,
    category: "legacy",
    amount_cents: amount,
    payment_method,
    notes: notesOut,
    expense_date: expenseDate,
    ...(created_at ? { created_at } : {}),
  };

  const { data: existing } = await supabase.from("store_expenses").select("id").eq("id", id).maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("store_expenses").update(payload).eq("id", id);
    if (error) {
      warnings.push(`Fila ${r + 1} (${concept}): update — ${error.message}`);
      skippedInvalid += 1;
      continue;
    }
    updated += 1;
  } else {
    const { error } = await supabase.from("store_expenses").insert(payload);
    if (error) {
      warnings.push(`Fila ${r + 1} (${concept}): insert — ${error.message}`);
      skippedInvalid += 1;
      continue;
    }
    inserted += 1;
  }
}

console.log(
  JSON.stringify(
    {
      csvPath,
      inserted,
      updated,
      skippedCancelled,
      skippedInvalid,
      warnings: warnings.slice(0, 40),
      warningsTotal: warnings.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 40) {
  console.error(
    `\n(Se omitieron ${warnings.length - 40} avisos adicionales en el JSON.)`,
  );
}
