#!/usr/bin/env node
/**
 * Seed desde Produtos.xlsx (raíz del repo por defecto).
 *
 * Columnas esperadas (nombres flexibles tras normalizar):
 *   PRODUCTO, DESCRIPCION, TAMAÑO, FRAGANCIA/Tono, CATEGORIA, VALOR, MARCA
 *   Opcional: NUMERO FOTO
 *
 * Uso:
 *   npm run seed:produtos
 *   node scripts/seed-produtos-xlsx.mjs /ruta/al/archivo.xlsx
 *
 * Requiere:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Stock inicial (opcional, enteros ≥ 0):
 *   SEED_STOCK_LOCAL (default 100)
 *   SEED_STOCK_WAREHOUSE (default 0)
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEFAULT_STOCK_LOCAL = Math.max(
  0,
  Math.floor(Number(process.env.SEED_STOCK_LOCAL ?? 100)),
);
const DEFAULT_STOCK_WAREHOUSE = Math.max(
  0,
  Math.floor(Number(process.env.SEED_STOCK_WAREHOUSE ?? 0)),
);

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

function normalizeHeader(h) {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function compactSpaces(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

/** Alineado con `lib/store-category-group.ts`. */
function normalizeCategoryLabel(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const CATEGORY_SYNONYM_CANONICAL = {
  "skin care": "cuidado de la piel",
  "make up": "maquillaje",
};

function categoryGroupKey(name) {
  const n = normalizeCategoryLabel(name);
  return CATEGORY_SYNONYM_CANONICAL[n] ?? n;
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

/** Misma lógica que `lib/fragrance-options.ts` (mantener alineado). */
const CONNECTOR_FIRST = /^(de|del|la|las|el|los|y|e|&)$/i;

function mergeFragrancePieces(pieces) {
  const out = [];
  for (const p of pieces) {
    const t = p.trim();
    if (!t) continue;
    if (out.length === 0) {
      out.push(t);
      continue;
    }
    const prev = out[out.length - 1];
    const prevWords = prev.split(/\s+/).filter(Boolean);
    const nextFirst = (t.split(/\s+/)[0] ?? "");

    if (CONNECTOR_FIRST.test(nextFirst)) {
      out[out.length - 1] = `${prev} ${t}`;
      continue;
    }
    if (/(\bde|del|la|las|el|los|y|e|&)$/i.test(prev.trim())) {
      out[out.length - 1] = `${prev} ${t}`;
      continue;
    }
    if (prevWords.length === 1 && /^[A-ZÀ-Ÿ]/.test(nextFirst)) {
      out[out.length - 1] = `${prev} ${t}`;
      continue;
    }
    out.push(t);
  }
  return out;
}

function splitConcatenatedTitleCase(blob) {
  const pieces = blob
    .split(/(?<=[a-záéíóúñ])\s+(?=[A-ZÀ-Ÿ])/)
    .map((x) => x.trim())
    .filter(Boolean);
  return mergeFragrancePieces(pieces);
}

function splitFragranceCell(cell) {
  const s = String(cell ?? "").trim();
  if (!s) return [];

  if (/[\n;,|]/.test(s)) {
    return s
      .split(/[\n;,|]+/)
      .map((x) => compactSpaces(x))
      .filter(Boolean);
  }

  const normalized = s.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  const doubleSpaced = normalized
    .split(/\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (doubleSpaced.length > 1) return doubleSpaced;

  const blob = doubleSpaced[0] ?? normalized;
  if (blob.length < 40) return [blob];

  return splitConcatenatedTitleCase(blob);
}

function splitFragranceOptions(raw) {
  const seen = new Set();
  const out = [];
  for (const piece of splitFragranceCell(raw)) {
    const t = piece.trim().slice(0, 160);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Interpreta "473 ml", "74 ml", etc. según constraint products_size_unit_check. */
function parseProductSize(raw) {
  const s = compactSpaces(raw).toLowerCase();
  if (!s) return { size_value: null, size_unit: null };
  const m = s.match(/^([\d.,]+)\s*(ml|l|g|kg|oz|unidad)s?\.?$/);
  if (!m) return { size_value: null, size_unit: null };
  const n = Number(String(m[1]).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return { size_value: null, size_unit: null };
  let u = m[2];
  if (u === "l") u = "l";
  else if (u === "ml") u = "ml";
  else if (u === "g") u = "g";
  else if (u === "kg") u = "kg";
  else if (u === "oz") u = "oz";
  else u = "unidad";
  return { size_value: Number(n.toFixed(2)), size_unit: u };
}

/**
 * Pesos COP enteros (mismo significado que `price_cents` en README).
 * Con `sheet_to_json(..., { raw: false })`, Excel suele dar "$ 75,000.00" y al concatenar
 * solo dígitos se obtiene 7500000 en vez de 75000 — por eso preferimos `raw: true` y
 * este parser tolera ambos formatos.
 */
function parsePricePesos(raw) {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  let s = String(raw)
    .trim()
    .replace(/\$\s*/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!s) return 0;

  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0
      ? Math.min(n, Number.MAX_SAFE_INTEGER)
      : 0;
  }

  // es-CO: miles con punto (antes que US: evita leer 75.000 como “75 con 3 decimales”).
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    const comma = s.lastIndexOf(",");
    const head = comma >= 0 ? s.slice(0, comma) : s;
    const intPart = head.replace(/\./g, "");
    const n = parseInt(intPart, 10);
    return Number.isFinite(n) && n >= 0
      ? Math.min(n, Number.MAX_SAFE_INTEGER)
      : 0;
  }

  // US / Excel tipográfico: 75,000.00
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    const dot = s.lastIndexOf(".");
    const head = dot >= 0 ? s.slice(0, dot) : s;
    const intPart = head.replace(/,/g, "");
    const n = parseInt(intPart, 10);
    return Number.isFinite(n) && n >= 0
      ? Math.min(n, Number.MAX_SAFE_INTEGER)
      : 0;
  }

  // Decimal sin miles: 75000.99
  if (/^\d+\.\d{1,2}$/.test(s)) {
    const n = Math.round(Number(s));
    return Number.isFinite(n) && n >= 0
      ? Math.min(n, Number.MAX_SAFE_INTEGER)
      : 0;
  }

  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, Number.MAX_SAFE_INTEGER) : 0;
}

function columnIndex(headersNorm, predicate) {
  return headersNorm.findIndex(predicate);
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

const xlsxArg = process.argv[2]?.trim();
const xlsxPath = xlsxArg
  ? resolve(process.cwd(), xlsxArg)
  : join(root, "Produtos.xlsx");

if (!existsSync(xlsxPath)) {
  console.error(`No existe el archivo: ${xlsxPath}`);
  process.exit(1);
}

const workbook = XLSX.readFile(xlsxPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  /** Números nativos; si es false, VALOR llega como "$ 75,000.00" y rompe el parser. */
  raw: true,
});

const headerRowIndex = matrix.findIndex((r) =>
  Array.isArray(r) &&
  r.some((c) => normalizeHeader(c) === "PRODUCTO"),
);

if (headerRowIndex < 0) {
  console.error("No se encontró la fila de cabecera con columna PRODUCTO.");
  process.exit(1);
}

const headersNorm = matrix[headerRowIndex].map((h) => normalizeHeader(h));

const idxProducto = columnIndex(headersNorm, (h) => h === "PRODUCTO");
const idxDescripcion = columnIndex(
  headersNorm,
  (h) => h === "DESCRIPCION" || h.startsWith("DESCRIPCION"),
);
const idxTamano = columnIndex(
  headersNorm,
  (h) => h === "TAMANO" || h === "TAMAÑO" || h.includes("TAMANO"),
);
const idxFragancia = columnIndex(headersNorm, (h) => h.includes("FRAGANCIA"));
const idxCategoria = columnIndex(headersNorm, (h) => h === "CATEGORIA");
const idxValor = columnIndex(headersNorm, (h) => h === "VALOR");
const idxMarca = columnIndex(headersNorm, (h) => h === "MARCA");
const idxFoto = columnIndex(headersNorm, (h) => h.includes("NUMERO") && h.includes("FOTO"));

if (idxProducto < 0 || idxCategoria < 0) {
  console.error("Faltan columnas mínimas PRODUCTO / CATEGORIA.");
  process.exit(1);
}

const records = [];
for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
  const r = matrix[i];
  if (!Array.isArray(r)) continue;
  const name = compactSpaces(r[idxProducto] ?? "");
  const categoryName = compactSpaces(r[idxCategoria] ?? "");
  if (!name || !categoryName) continue;

  const description = compactSpaces(r[idxDescripcion] ?? "");
  const tamanoRaw = r[idxTamano] ?? "";
  const fragRaw = r[idxFragancia] ?? "";
  const brand = compactSpaces(r[idxMarca] ?? "");
  const photoRef =
    idxFoto >= 0 ? compactSpaces(r[idxFoto] ?? "") : "";
  const valorCell = idxValor >= 0 ? r[idxValor] : "";

  const { size_value, size_unit } = parseProductSize(tamanoRaw);
  const fragrance_options = splitFragranceOptions(fragRaw);
  const price_cents = parsePricePesos(valorCell);

  records.push({
    rowNumber: i + 1,
    name,
    description,
    tamanoRaw: compactSpaces(tamanoRaw),
    size_value,
    size_unit,
    fragrance_options,
    categoryName,
    brand,
    photoRef,
    price_cents,
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

const existingGroupKeys = new Set(
  (existingCategories ?? []).map((c) =>
    categoryGroupKey(compactSpaces(c.name)),
  ),
);

const missingCategories = categoryNames
  .filter(
    (name) => !existingGroupKeys.has(categoryGroupKey(compactSpaces(name))),
  )
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
  .select("id,name,sort_order");
if (catReloadErr) {
  console.error("Error recargando categorías:", catReloadErr.message);
  process.exit(1);
}

const rowsByGroupKey = new Map();
for (const c of categoriesAfter ?? []) {
  const gk = categoryGroupKey(compactSpaces(c.name));
  const arr = rowsByGroupKey.get(gk) ?? [];
  arr.push(c);
  rowsByGroupKey.set(gk, arr);
}

const categoryIdByGroupKey = new Map();
for (const [gk, arr] of rowsByGroupKey) {
  const sorted = [...arr].sort(
    (a, b) =>
      (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
      String(a.name).localeCompare(String(b.name), "es"),
  );
  categoryIdByGroupKey.set(gk, sorted[0].id);
}

const products = records.map((r) => {
  const categoryId =
    categoryIdByGroupKey.get(categoryGroupKey(compactSpaces(r.categoryName))) ??
    null;
  const sizeKey = r.size_value != null && r.size_unit
    ? `${r.size_value}${r.size_unit}`
    : r.tamanoRaw || "";
  const reference = compactSpaces(
    [r.brand, r.name, sizeKey].filter(Boolean).join(" · "),
  ).slice(0, 120);

  const id = stableUuidFromString(
    `produtos-xlsx|row:${r.rowNumber}|${r.name}|${r.brand}|${sizeKey}|${r.categoryName}`,
  );

  const extraTamano =
    r.tamanoRaw && (r.size_value == null || !r.size_unit)
      ? `\n\nPresentación: ${r.tamanoRaw}.`
      : "";

  const extraFoto = r.photoRef ? `\n\nReferencias de foto: ${r.photoRef}.` : "";

  const fullDescription =
    (r.description || "Sin descripción.") + extraTamano + extraFoto;

  return {
    id,
    name: r.name,
    description: compactSpaces(fullDescription),
    price_cents: r.price_cents,
    cost_cents: 0,
    currency: "COP",
    stock_local: DEFAULT_STOCK_LOCAL,
    stock_warehouse: DEFAULT_STOCK_WAREHOUSE,
    is_published: true,
    category_id: categoryId,
    brand: r.brand || "",
    reference: reference || r.name.slice(0, 120),
    image_path: null,
    size_value: r.size_value,
    size_unit: r.size_unit,
    fragrance_options: r.fragrance_options,
    colors: [],
  };
});

const { error: upsertErr } = await supabase.from("products").upsert(products, {
  onConflict: "id",
});

if (upsertErr) {
  console.error("Error upsert productos:", upsertErr.message);
  process.exit(1);
}

console.log(`XLSX: ${xlsxPath} (hoja: ${sheetName})`);
console.log(`Categorías detectadas: ${categoryNames.length}`);
console.log(`Categorías nuevas creadas: ${missingCategories.length}`);
console.log(`Filas en Excel (válidas): ${records.length}`);
console.log(`Productos upsertados: ${products.length}`);
console.log(
  `Precios tomados de VALOR (pesos COP). Stock inicial: local=${DEFAULT_STOCK_LOCAL}, bodega=${DEFAULT_STOCK_WAREHOUSE} (env SEED_STOCK_LOCAL / SEED_STOCK_WAREHOUSE).`,
);
