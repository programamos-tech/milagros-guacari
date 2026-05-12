#!/usr/bin/env node
/**
 * Importa productos desde products_rows.csv → public.products.
 *
 * Reglas (IVA venta + compra sin IVA):
 * - price_cents = redondeo de price_before_tax (base venta sin IVA; igual que la app).
 * - cost_cents = redondeo de cost_before_tax (compra sin IVA).
 * - has_vat + vat_percent: se infieren para que el bruto coincida con `price`
 *   (misma fórmula que lib/product-vat-price.ts: round(net * (1 + pct/100))).
 *   El IVA recaudado por unidad en POS/checkout es gross − net (unitVatAmountCents).
 *
 * Uso:
 *   npm run import:products
 *   node scripts/import-products-from-csv.mjs /ruta/products_rows.csv
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

function parseMoneyInt(s) {
  const t = compactSpaces(s).replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function parseTimestamptz(s) {
  const t = compactSpaces(s);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Igual que unitPriceGrossCents en lib/product-vat-price.ts */
function unitPriceGrossCents(price_cents, has_vat, vat_percent) {
  const base = Math.max(0, Math.round(Number(price_cents ?? 0)));
  if (!has_vat) return base;
  const pct = Math.max(0, Number(vat_percent ?? 0));
  return Math.round(base * (1 + pct / 100));
}

/**
 * Busca vat_percent en [0, 100] con paso 0.01 tal que round(net * (1+p/100)) === gross.
 * Si no hay match exacto, elige el p con menor error absoluto en el bruto.
 */
function inferSaleVat(netInt, grossInt) {
  if (!Number.isFinite(netInt) || netInt <= 0) {
    return { has_vat: false, vat_percent: null };
  }
  if (!Number.isFinite(grossInt) || grossInt <= 0) {
    return { has_vat: false, vat_percent: null };
  }
  if (grossInt <= netInt) {
    return { has_vat: false, vat_percent: null };
  }

  let bestPct = 19;
  let bestDiff = Infinity;
  for (let hund = 0; hund <= 10000; hund += 1) {
    const pct = hund / 100;
    const g = Math.round(netInt * (1 + pct / 100));
    const diff = Math.abs(g - grossInt);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestPct = pct;
    }
    if (diff === 0) {
      return { has_vat: true, vat_percent: pct };
    }
  }

  if (bestDiff <= 2) {
    return { has_vat: true, vat_percent: bestPct };
  }

  const fallback = Math.round(10000 * (grossInt / netInt - 1)) / 100;
  const clamped = Math.min(100, Math.max(0, fallback));
  return { has_vat: true, vat_percent: clamped };
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
  : join(root, "products_rows.csv");

if (!existsSync(csvPath)) {
  console.error(`No existe el CSV: ${csvPath}`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: catRows, error: catErr } = await supabase
  .from("categories")
  .select("id");

if (catErr) {
  console.error("No se pudieron cargar categorías:", catErr.message);
  process.exit(1);
}

const validCategoryIds = new Set((catRows ?? []).map((r) => r.id));

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
  description: col("description"),
  category_id: col("category_id"),
  brand: col("brand"),
  reference: col("reference"),
  price: col("price"),
  cost: col("cost"),
  stock_warehouse: col("stock_warehouse"),
  stock_store: col("stock_store"),
  status: col("status"),
  created_at: col("created_at"),
  updated_at: col("updated_at"),
  cost_before_tax: col("cost_before_tax"),
  price_before_tax: col("price_before_tax"),
};

if (I.name < 0) {
  console.error("El CSV debe incluir columna name.");
  process.exit(1);
}

const warnings = [];
let inserted = 0;
let updated = 0;
let skipped = 0;

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

  const id = UUID_RE.test(legacyId) ? legacyId : randomUUID();
  if (!UUID_RE.test(legacyId)) {
    warnings.push(`Fila ${r + 1} (${name}): id inválido, se generó uno nuevo.`);
  }

  let categoryIdRaw = compactSpaces(get(I.category_id));
  let categoryId = null;
  if (categoryIdRaw) {
    if (validCategoryIds.has(categoryIdRaw)) categoryId = categoryIdRaw;
    else {
      warnings.push(
        `Fila ${r + 1} (${name}): category_id no existe en esta base, se omite.`,
      );
    }
  }

  const description = compactSpaces(get(I.description)) || "";
  const brand = compactSpaces(get(I.brand)) || "";
  const reference = compactSpaces(get(I.reference)) || "";

  const priceGross = parseMoneyInt(get(I.price));
  let priceNet = parseMoneyInt(get(I.price_before_tax));
  if (priceNet === null && priceGross !== null) {
    priceNet = priceGross;
    warnings.push(
      `Fila ${r + 1} (${name}): sin price_before_tax, se usa price como base (sin IVA inferido).`,
    );
  }
  if (priceNet === null) {
    warnings.push(`Fila ${r + 1} (${name}): sin precio válido, omitida.`);
    skipped += 1;
    continue;
  }

  let costNet = parseMoneyInt(get(I.cost_before_tax));
  if (costNet === null) {
    costNet = parseMoneyInt(get(I.cost)) ?? 0;
    if (costNet > 0) {
      warnings.push(
        `Fila ${r + 1} (${name}): sin cost_before_tax, se usa cost (puede incluir impuestos).`,
      );
    }
  }

  let costGross = parseMoneyInt(get(I.cost));
  if (costGross === null) {
    costGross = costNet;
  }

  const stockWh = parseMoneyInt(get(I.stock_warehouse)) ?? 0;
  const stockLocal = parseMoneyInt(get(I.stock_store)) ?? 0;

  const status = compactSpaces(get(I.status)).toLowerCase();
  const is_published = status === "" || status === "active";

  const { has_vat, vat_percent: vatPctRaw } =
    priceGross !== null
      ? inferSaleVat(priceNet, priceGross)
      : inferSaleVat(priceNet, priceNet);

  const vat_percent =
    has_vat && vatPctRaw !== null
      ? Math.round(Number(vatPctRaw) * 100) / 100
      : null;

  const grossCheck =
    priceGross !== null
      ? unitPriceGrossCents(priceNet, has_vat, vat_percent)
      : priceNet;
  if (
    priceGross !== null &&
    has_vat &&
    Math.abs(grossCheck - priceGross) > 2
  ) {
    warnings.push(
      `Fila ${r + 1} (${name}): bruto calculado ${grossCheck} vs CSV price ${priceGross} (IVA ${vat_percent}%).`,
    );
  }

  const created_at = parseTimestamptz(get(I.created_at));
  const updated_at = parseTimestamptz(get(I.updated_at));

  const payload = {
    name,
    description,
    category_id: categoryId,
    brand,
    reference,
    price_cents: priceNet,
    cost_cents: costNet,
    cost_gross_cents: costGross,
    stock_warehouse: stockWh,
    stock_local: stockLocal,
    is_published,
    has_vat,
    vat_percent: has_vat ? vat_percent : null,
    currency: "COP",
    ...(created_at ? { created_at } : {}),
    ...(updated_at ? { updated_at } : {}),
  };

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("products")
      .update({
        ...payload,
        updated_at: updated_at ?? new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      warnings.push(`Fila ${r + 1} (${name}): update — ${error.message}`);
      skipped += 1;
      continue;
    }
    updated += 1;
  } else {
    const { error } = await supabase.from("products").insert({ id, ...payload });
    if (error) {
      warnings.push(`Fila ${r + 1} (${name}): insert — ${error.message}`);
      skipped += 1;
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
      skipped,
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
