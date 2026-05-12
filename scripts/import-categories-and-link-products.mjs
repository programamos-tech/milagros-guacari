#!/usr/bin/env node
/**
 * 1) Importa categorías desde categories_rows.csv (mismos UUID que el sistema legacy).
 * 2) Asigna public.products.category_id leyendo products_rows.csv:
 *    - Si el CSV trae category_id y existe en categorías → se usa.
 *    - Si viene vacío → inferencia por nombre (ver inferCategoryId); desactivar con --no-infer.
 *
 * Uso:
 *   npm run import:categories
 *   node scripts/import-categories-and-link-products.mjs /ruta/categories.csv /ruta/products.csv --no-infer
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** UUIDs fijos del CSV categories_rows.csv */
const CAT = {
  cabello: "1eeadfe5-8d22-4743-aa09-bfa2c632bf5a",
  perfumes: "28f12e65-7381-491f-a457-50e7e4a7c411",
  bolsos: "4e9958d4-f88c-4165-8fcd-4a45c9ee0067",
  accesorios: "503a0922-8639-4842-98f4-28305af75f0c",
  maquillaje: "92e7bc8a-b3fa-4c6c-91bc-ed7114be2be5",
  piel: "e00e2122-694b-4dab-8805-9241e8991111",
  joyeria: "e3f4f653-44c3-4f51-9e0c-d905c5fa3513",
};

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

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseTimestamptz(s) {
  const t = compactSpaces(s);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function iconKeyForCategoryName(name) {
  const n = stripAccents(compactSpaces(name)).toUpperCase();
  if (n.includes("MAQUILLAJE")) return "paintbrush";
  if (n.includes("PIEL")) return "sparkles";
  if (n.includes("BOLSO")) return "shopping-bag";
  if (n.includes("CABELLO")) return "hand-heart";
  if (n.includes("PERFUM")) return "tag";
  if (n.includes("JOYER") || n.includes("ACCESOR")) return "tag";
  return "tag";
}

/**
 * Cuando products_rows.csv no trae category_id: heurística conservadora.
 */
function inferCategoryId(name) {
  const n = stripAccents(compactSpaces(name)).toLowerCase();

  if (/protector solar|parches anti|serum facial/.test(n)) return CAT.piel;
  if (/serum corporal|locion corporal/.test(n)) return CAT.piel;

  if (/serum para pestanas|pestanas|pestañas/.test(n)) return CAT.maquillaje;

  if (/cepillo|peinillas|cosmetiquera/.test(n)) return CAT.accesorios;
  if (/bolsas|talego/.test(n)) return CAT.bolsos;

  if (/\bperfume\b/.test(n) && !/capilar/.test(n)) return CAT.perfumes;
  if (/kit miniperfumes|miniperfume/.test(n)) return CAT.perfumes;

  return CAT.cabello;
}

function argvPaths() {
  const args = process.argv.slice(2).filter((a) => a !== "--no-infer");
  const noInfer = process.argv.includes("--no-infer");
  const catPath = args[0]
    ? resolve(process.cwd(), args[0])
    : join(root, "categories_rows.csv");
  const prodPath = args[1]
    ? resolve(process.cwd(), args[1])
    : join(root, "products_rows.csv");
  return { catPath, prodPath, noInfer };
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

const { catPath, prodPath, noInfer } = argvPaths();

if (!existsSync(catPath)) {
  console.error(`No existe: ${catPath}`);
  process.exit(1);
}
if (!existsSync(prodPath)) {
  console.error(`No existe: ${prodPath}`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const catMatrix = parseCsv(readFileSync(catPath, "utf8"));
if (catMatrix.length < 2) {
  console.error("categories CSV vacío.");
  process.exit(1);
}

const ch = catMatrix[0].map((h) => compactSpaces(h).toLowerCase());
const cCol = (n) => ch.indexOf(n);
const CI = {
  id: cCol("id"),
  name: cCol("name"),
  created_at: cCol("created_at"),
  updated_at: cCol("updated_at"),
};

if (CI.id < 0 || CI.name < 0) {
  console.error("categories_rows.csv debe tener columnas id y name.");
  process.exit(1);
}

const categoryRows = [];
for (let r = 1; r < catMatrix.length; r += 1) {
  const row = catMatrix[r];
  const get = (idx) => (idx >= 0 ? String(row[idx] ?? "") : "");
  const id = compactSpaces(get(CI.id));
  const name = compactSpaces(get(CI.name));
  if (!id || !name) continue;
  if (!UUID_RE.test(id)) {
    console.error(`Categoría fila ${r + 1}: id UUID inválido`);
    process.exit(1);
  }
  categoryRows.push({
    id,
    name,
    sort_order: (r - 1) * 10,
    icon_key: iconKeyForCategoryName(name),
    created_at: parseTimestamptz(get(CI.created_at)),
    updated_at: parseTimestamptz(get(CI.updated_at)),
  });
}

const { error: upsertCatErr } = await supabase.from("categories").upsert(
  categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    icon_key: c.icon_key,
    ...(c.created_at ? { created_at: c.created_at } : {}),
    ...(c.updated_at ? { updated_at: c.updated_at } : {}),
  })),
  { onConflict: "id" },
);

if (upsertCatErr) {
  console.error("Upsert categorías:", upsertCatErr.message);
  process.exit(1);
}

const validCategoryIds = new Set(categoryRows.map((c) => c.id));

const prodMatrix = parseCsv(readFileSync(prodPath, "utf8"));
const ph = prodMatrix[0].map((h) => compactSpaces(h).toLowerCase());
const pCol = (n) => ph.indexOf(n);
const PI = {
  id: pCol("id"),
  name: pCol("name"),
  category_id: pCol("category_id"),
};

if (PI.id < 0 || PI.name < 0) {
  console.error("products_rows.csv debe tener id y name.");
  process.exit(1);
}

let linked = 0;
let skipped = 0;
const warnings = [];

for (let r = 1; r < prodMatrix.length; r += 1) {
  const row = prodMatrix[r];
  const get = (idx) => (idx >= 0 ? String(row[idx] ?? "") : "");
  const id = compactSpaces(get(PI.id));
  const name = compactSpaces(get(PI.name));
  if (!id || !name) {
    skipped += 1;
    continue;
  }
  if (!UUID_RE.test(id)) {
    warnings.push(`Producto fila ${r + 1}: id inválido`);
    skipped += 1;
    continue;
  }

  const csvCat = compactSpaces(get(PI.category_id));
  let categoryId = null;
  if (csvCat && validCategoryIds.has(csvCat)) {
    categoryId = csvCat;
  } else if (csvCat) {
    warnings.push(
      `Producto ${name}: category_id del CSV no está en categories_rows, se infiere.`,
    );
  }

  if (!categoryId && !noInfer) {
    categoryId = inferCategoryId(name);
  }

  if (!categoryId) {
    warnings.push(`Producto ${name}: sin categoría (CSV vacío y --no-infer).`);
    skipped += 1;
    continue;
  }

  const { data: exists, error: exErr } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (exErr) {
    warnings.push(`${name}: ${exErr.message}`);
    skipped += 1;
    continue;
  }
  if (!exists?.id) {
    warnings.push(`Producto ${id} (${name}): no existe en la base, se omite.`);
    skipped += 1;
    continue;
  }

  const { error: upErr } = await supabase
    .from("products")
    .update({ category_id: categoryId })
    .eq("id", id);

  if (upErr) {
    warnings.push(`${name}: update — ${upErr.message}`);
    skipped += 1;
    continue;
  }
  linked += 1;
}

console.log(
  JSON.stringify(
    {
      categoriesPath: catPath,
      categoriesUpserted: categoryRows.length,
      productsPath: prodPath,
      inferEnabled: !noInfer,
      productsUpdated: linked,
      skipped,
      warnings: warnings.slice(0, 30),
      warningsTotal: warnings.length,
    },
    null,
    2,
  ),
);
