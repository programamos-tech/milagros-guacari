#!/usr/bin/env node
/**
 * Actualiza solo precios/costos en `public.products` desde un CSV (mismo layout que export Supabase).
 *
 * Mapeo (columnas CSV → BD):
 * - `price_before_tax` → `price_cents` (venta sin IVA)
 * - `price`            → bruto venta (solo para fijar `has_vat`; no se guarda aparte)
 * - `cost_before_tax`  → `cost_cents` (compra sin IVA)
 * - `cost`             → `cost_gross_cents` (compra con IVA)
 * - `has_vat` / `vat_percent`: si `price` > `price_before_tax` → IVA 19 % (alineado con la app).
 *
 * No modifica nombre, stock, categoría, etc. Solo filas cuyo `id` ya existe.
 *
 * Uso:
 *   node scripts/sync-product-prices-from-csv.mjs
 *   node scripts/sync-product-prices-from-csv.mjs "./products_rows (3).csv"
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

const STANDARD_SALE_VAT = 19;

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

function unitPriceGrossCents(priceNet, has_vat) {
  const base = Math.max(0, Math.round(Number(priceNet ?? 0)));
  if (!has_vat) return base;
  return Math.round(base * (1 + STANDARD_SALE_VAT / 100));
}

function saleVatFromPrices(netInt, grossInt) {
  if (!Number.isFinite(netInt) || netInt <= 0) {
    return { has_vat: false, vat_percent: null };
  }
  if (!Number.isFinite(grossInt) || grossInt <= 0) {
    return { has_vat: false, vat_percent: null };
  }
  if (grossInt <= netInt) {
    return { has_vat: false, vat_percent: null };
  }
  return { has_vat: true, vat_percent: STANDARD_SALE_VAT };
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
  : join(root, "products_rows (3).csv");

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
  price: col("price"),
  cost: col("cost"),
  cost_before_tax: col("cost_before_tax"),
  price_before_tax: col("price_before_tax"),
};

if (I.id < 0) {
  console.error("El CSV debe incluir columna id.");
  process.exit(1);
}

const warnings = [];
let updated = 0;
let skipped = 0;
let missing = 0;

for (let r = 1; r < matrix.length; r += 1) {
  const row = matrix[r];
  const get = (idx) => (idx >= 0 ? String(row[idx] ?? "") : "");

  const legacyId = compactSpaces(get(I.id));
  if (!legacyId) {
    skipped += 1;
    continue;
  }
  if (!UUID_RE.test(legacyId)) {
    warnings.push(`Fila ${r + 1}: id inválido (${legacyId}), omitida.`);
    skipped += 1;
    continue;
  }

  const priceGross = parseMoneyInt(get(I.price));
  let priceNet = parseMoneyInt(get(I.price_before_tax));
  if (priceNet === null && priceGross !== null) {
    priceNet = priceGross;
    warnings.push(
      `Fila ${r + 1} (${legacyId}): sin price_before_tax, se usa price como base.`,
    );
  }
  if (priceNet === null) {
    warnings.push(`Fila ${r + 1} (${legacyId}): sin precio de venta válido, omitida.`);
    skipped += 1;
    continue;
  }

  let costNet = parseMoneyInt(get(I.cost_before_tax));
  if (costNet === null) {
    costNet = parseMoneyInt(get(I.cost)) ?? 0;
    if (costNet > 0) {
      warnings.push(
        `Fila ${r + 1} (${legacyId}): sin cost_before_tax, se usa cost como neto (revisar).`,
      );
    }
  }

  let costGross = parseMoneyInt(get(I.cost));
  if (costGross === null) {
    costGross = costNet;
  }

  const { has_vat, vat_percent: vatPctRaw } =
    priceGross !== null
      ? saleVatFromPrices(priceNet, priceGross)
      : saleVatFromPrices(priceNet, priceNet);

  const vat_percent =
    has_vat && vatPctRaw !== null ? Math.round(Number(vatPctRaw) * 100) / 100 : null;

  const grossCheck =
    priceGross !== null ? unitPriceGrossCents(priceNet, has_vat) : priceNet;
  if (
    priceGross !== null &&
    has_vat &&
    Math.abs(grossCheck - priceGross) > 2
  ) {
    warnings.push(
      `Fila ${r + 1} (${legacyId}): venta bruta calculada ${grossCheck} vs CSV price ${priceGross}.`,
    );
  }

  const { data: existing, error: selErr } = await supabase
    .from("products")
    .select("id")
    .eq("id", legacyId)
    .maybeSingle();

  if (selErr) {
    warnings.push(`Fila ${r + 1}: select — ${selErr.message}`);
    skipped += 1;
    continue;
  }
  if (!existing?.id) {
    missing += 1;
    warnings.push(`Fila ${r + 1}: producto ${legacyId} no existe en la base, omitido.`);
    skipped += 1;
    continue;
  }

  const { error } = await supabase
    .from("products")
    .update({
      price_cents: priceNet,
      cost_cents: costNet,
      cost_gross_cents: costGross,
      has_vat,
      vat_percent: has_vat ? vat_percent : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", legacyId);

  if (error) {
    warnings.push(`Fila ${r + 1} (${legacyId}): update — ${error.message}`);
    skipped += 1;
    continue;
  }
  updated += 1;
}

console.log(
  JSON.stringify(
    {
      csvPath,
      updated,
      skipped,
      missingNotInDb: missing,
      warnings: warnings.slice(0, 50),
      warningsTotal: warnings.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 50) {
  console.error(`\n(Se listan solo 50 de ${warnings.length} avisos.)`);
}
