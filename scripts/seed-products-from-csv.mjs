#!/usr/bin/env node
/**
 * Seeder desde CSV de productos.
 *
 * Uso:
 *   node scripts/seed-products-from-csv.mjs
 *   node scripts/seed-products-from-csv.mjs "public/archivo.csv"
 *
 * Requiere:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * (pueden vivir en .env.local)
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

function normalizeHeader(h) {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function compactSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

function stableUuidFromString(input) {
  const hex = createHash("md5").update(input).digest("hex");
  const arr = hex.slice(0, 32).split("");
  arr[12] = "4";
  arr[16] = "8";
  const h = arr.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(
    16,
    20,
  )}-${h.slice(20, 32)}`;
}

function iconKeyForCategory(name) {
  const n = normalizeHeader(name);
  if (n.includes("CUIDADO CORPORAL")) return "hand-heart";
  if (n.includes("VITAMINAS")) return "pill";
  if (n.includes("PIEL")) return "sparkles";
  if (n.includes("MAQUILLAJE")) return "paintbrush";
  if (n.includes("TERMO")) return "thermometer";
  if (n === "ROPA") return "shirt";
  if (n.includes("BOLSO")) return "shopping-bag";
  if (n.includes("ZAPAT")) return "footprints";
  return "tag";
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
  : join(root, "public", "1. Produtos.xlsx - Hoja1 (1).csv");

if (!existsSync(csvPath)) {
  console.error(`No existe el CSV: ${csvPath}`);
  process.exit(1);
}

const csvRaw = readFileSync(csvPath, "utf8");
const matrix = parseCsv(csvRaw);

if (!matrix.length) {
  console.error("CSV vacío.");
  process.exit(1);
}

const headerRowIndex = matrix.findIndex((r) =>
  r.some((c) => normalizeHeader(c) === "PRODUCTO"),
);
if (headerRowIndex < 0) {
  console.error("No se encontró cabecera con columna PRODUCTO.");
  process.exit(1);
}

const headers = matrix[headerRowIndex].map((h) => normalizeHeader(h));
const col = (name) => headers.findIndex((h) => h === name);

const idxProducto = col("PRODUCTO");
const idxDescripcion = col("DESCRIPCION");
const idxTamano = col("TAMANO");
const idxFragancia = col("FRAGANCIA");
const idxCategoria = col("CATEGORIA");
const idxMarca = col("MARCA");
const idxFoto = col("NUMERO FOTO");

if (idxProducto < 0 || idxCategoria < 0) {
  console.error("Faltan columnas mínimas PRODUCTO/CATEGORIA.");
  process.exit(1);
}

const records = [];
for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
  const r = matrix[i];
  const name = compactSpaces(r[idxProducto] ?? "");
  const categoryName = compactSpaces(r[idxCategoria] ?? "");
  if (!name || !categoryName) continue;

  const description = compactSpaces(r[idxDescripcion] ?? "");
  const size = compactSpaces(r[idxTamano] ?? "");
  const fragance = compactSpaces(r[idxFragancia] ?? "");
  const brand = compactSpaces(r[idxMarca] ?? "");
  const photoRef = compactSpaces(r[idxFoto] ?? "");

  records.push({
    rowNumber: i + 1,
    name,
    description,
    size,
    fragance,
    categoryName,
    brand,
    photoRef,
  });
}

if (!records.length) {
  console.error("No se detectaron filas válidas para insertar.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const categoryNames = Array.from(
  new Set(records.map((r) => r.categoryName).filter(Boolean)),
);
const normalizedOrder = new Map(
  categoryNames.map((n, i) => [n, (i + 1) * 10]),
);

const { data: existingCategories, error: catReadErr } = await supabase
  .from("categories")
  .select("id,name");

if (catReadErr) {
  console.error("Error leyendo categorías:", catReadErr.message);
  process.exit(1);
}

const existingByName = new Map(
  (existingCategories ?? []).map((c) => [compactSpaces(c.name), c.id]),
);

const missingCategories = categoryNames
  .filter((name) => !existingByName.has(name))
  .map((name) => ({
    name,
    sort_order: normalizedOrder.get(name) ?? 999,
    icon_key: iconKeyForCategory(name),
  }));

if (missingCategories.length > 0) {
  const { error: catInsertErr } = await supabase
    .from("categories")
    .insert(missingCategories);
  if (catInsertErr) {
    console.error("Error creando categorías:", catInsertErr.message);
    process.exit(1);
  }
}

const { data: categoriesAfter, error: catReloadErr } = await supabase
  .from("categories")
  .select("id,name");
if (catReloadErr) {
  console.error("Error recargando categorías:", catReloadErr.message);
  process.exit(1);
}

const categoryIdByName = new Map(
  (categoriesAfter ?? []).map((c) => [compactSpaces(c.name), c.id]),
);

const products = records.map((r) => {
  const categoryId = categoryIdByName.get(r.categoryName) ?? null;
  const reference = compactSpaces(
    [r.brand, r.name, r.size].filter(Boolean).join(" · "),
  ).slice(0, 120);

  const details = [
    r.description,
    r.size ? `Tamaño: ${r.size}.` : "",
    r.fragance ? `Fragancia: ${r.fragance}.` : "",
    r.brand ? `Marca: ${r.brand}.` : "",
    r.photoRef ? `Fotos referencia: ${r.photoRef}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: stableUuidFromString(
      `${r.name}|${r.brand}|${r.size}|${r.fragance}|${r.categoryName}`,
    ),
    name: r.name,
    description: details || "Sin descripción.",
    price_cents: 0,
    cost_cents: 0,
    currency: "COP",
    stock_local: 0,
    stock_warehouse: 0,
    is_published: false,
    category_id: categoryId,
    brand: r.brand || "",
    reference,
    image_path: null,
  };
});

const { error: upsertErr } = await supabase.from("products").upsert(products, {
  onConflict: "id",
});

if (upsertErr) {
  console.error("Error upsert productos:", upsertErr.message);
  process.exit(1);
}

console.log(`CSV: ${csvPath}`);
console.log(`Categorías detectadas: ${categoryNames.length}`);
console.log(`Categorías nuevas creadas: ${missingCategories.length}`);
console.log(`Productos procesados: ${records.length}`);
console.log(`Productos upsertados: ${products.length}`);
console.log(
  "Nota: los productos se cargan con price_cents=0, stock=0 e is_published=false para revisión en admin.",
);
