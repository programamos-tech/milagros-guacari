#!/usr/bin/env node
/**
 * Migra ventas legacy (CSV) → public.orders + public.order_items.
 *
 * Archivos (por defecto en la raíz del repo):
 *   - sales_rows.csv
 *   - sale_items_rows.csv
 *   - sale_payments_rows.csv (opcional; refina POS:cash / POS:transfer / POS:mixed)
 *
 *   El estado del pedido sale solo de sales_rows (`completed` → paid, `cancelled` → cancelled).
 *   No usamos payments_rows: allí `pending` suele ser contable / conciliación, no “venta a crédito”.
 *
 * Convención de montos: igual que el resto del proyecto (`total_cents`, `unit_price_cents` = pesos COP enteros).
 * No descuenta inventario (histórico ya consumido en el sistema anterior).
 *
 * Post-import: `npm run verify:sales` (opcional `-- --from=YYYY-MM-DD --to=YYYY-MM-DD`).
 *
 * Uso:
 *   npm run import:sales
 *   npm run verify:sales
 *   node scripts/import-sales-from-csv.mjs --replace
 *   node scripts/import-sales-from-csv.mjs /ruta/sales_rows.csv /ruta/sale_items_rows.csv [/ruta/sale_payments_rows.csv]
 *
 * Flags:
 *   --replace  Reemplaza órdenes existentes (mismo id): borra líneas, actualiza cabecera, reinserta ítems.
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

function parseTimestamptz(s) {
  const t = compactSpaces(s);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseArgvPathsAndFlags() {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const posArgs = args.filter((a) => a !== "--replace");
  const salesPath = posArgs[0]
    ? resolve(process.cwd(), posArgs[0])
    : join(root, "sales_rows.csv");
  const itemsPath = posArgs[1]
    ? resolve(process.cwd(), posArgs[1])
    : join(root, "sale_items_rows.csv");
  const salePaymentsPath = posArgs[2]
    ? resolve(process.cwd(), posArgs[2])
    : join(root, "sale_payments_rows.csv");
  return { replace, salesPath, itemsPath, salePaymentsPath };
}

function headerIndex(matrix) {
  const headers = matrix[0].map((h) => compactSpaces(h));
  const col = (name) => headers.indexOf(name);
  return { headers, col };
}

function posWompiReference(saleId, csvPaymentMethod, paymentTypesBySale) {
  const types = paymentTypesBySale.get(saleId);
  if (types && types.size > 1) return "POS:mixed";
  if (types && types.size === 1) {
    const t = [...types][0].toLowerCase();
    if (t === "cash" || t === "efectivo") return "POS:cash";
    if (t === "transfer" || t === "transferencia") return "POS:transfer";
    return "POS:transfer";
  }
  const m = String(csvPaymentMethod ?? "").toLowerCase();
  if (m === "cash") return "POS:cash";
  if (m === "transfer") return "POS:transfer";
  if (m === "mixed") return "POS:mixed";
  return "POS:transfer";
}

/** Solo `sales.status`: en el CSV legacy `completed` = venta cerrada en caja. */
function mapOrderStatus(saleStatus) {
  const s = String(saleStatus ?? "").toLowerCase();
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "completed" || s === "paid" || s === "complete") return "paid";
  return "pending";
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAllCustomerRows(supabase) {
  const map = new Map();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,email")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`customers: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      map.set(r.id, {
        name: String(r.name ?? "Cliente"),
        email: r.email != null ? String(r.email).trim() : "",
      });
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function fetchProductIdSet(supabase) {
  const ids = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`products: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) ids.add(r.id);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function fetchExistingOrderIds(supabase, ids) {
  const found = new Set();
  for (const part of chunk(ids, 40)) {
    const { data, error } = await supabase.from("orders").select("id").in("id", part);
    if (error) throw new Error(`orders lookup: ${error.message}`);
    for (const r of data ?? []) found.add(r.id);
  }
  return found;
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

const { replace, salesPath, itemsPath, salePaymentsPath } = parseArgvPathsAndFlags();

if (!existsSync(salesPath)) {
  console.error(`No existe sales CSV: ${salesPath}`);
  process.exit(1);
}
if (!existsSync(itemsPath)) {
  console.error(`No existe sale_items CSV: ${itemsPath}`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const salesMatrix = parseCsv(readFileSync(salesPath, "utf8"));
const itemsMatrix = parseCsv(readFileSync(itemsPath, "utf8"));

if (salesMatrix.length < 2) {
  console.error("sales_rows.csv vacío o sin datos.");
  process.exit(1);
}
if (itemsMatrix.length < 2) {
  console.error("sale_items_rows.csv vacío o sin datos.");
  process.exit(1);
}

const salePayTypesBySale = new Map();
if (existsSync(salePaymentsPath)) {
  const m = parseCsv(readFileSync(salePaymentsPath, "utf8"));
  if (m.length >= 2) {
    const { col } = headerIndex(m);
    const saleIdCol = col("sale_id");
    const typeCol = col("payment_type");
    if (saleIdCol >= 0 && typeCol >= 0) {
      for (let r = 1; r < m.length; r += 1) {
        const row = m[r];
        const sid = compactSpaces(row[saleIdCol] ?? "");
        const pt = compactSpaces(row[typeCol] ?? "").toLowerCase();
        if (!UUID_RE.test(sid) || !pt) continue;
        if (!salePayTypesBySale.has(sid)) salePayTypesBySale.set(sid, new Set());
        salePayTypesBySale.get(sid).add(pt);
      }
    }
  }
}

const { col: colS } = headerIndex(salesMatrix);
const SI = {
  id: colS("id"),
  invoice_number: colS("invoice_number"),
  client_id: colS("client_id"),
  client_name: colS("client_name"),
  total: colS("total"),
  status: colS("status"),
  payment_method: colS("payment_method"),
  notes: colS("notes"),
  created_at: colS("created_at"),
  updated_at: colS("updated_at"),
  cancellation_reason: colS("cancellation_reason"),
  cancelled_at: colS("cancelled_at"),
};

for (const [k, v] of Object.entries(SI)) {
  if (v < 0) {
    console.error(`Falta columna en sales CSV: ${k}`);
    process.exit(1);
  }
}

const { col: colI } = headerIndex(itemsMatrix);
const II = {
  id: colI("id"),
  sale_id: colI("sale_id"),
  product_id: colI("product_id"),
  product_name: colI("product_name"),
  quantity: colI("quantity"),
  unit_price: colI("unit_price"),
  total: colI("total"),
};

for (const [k, v] of Object.entries(II)) {
  if (v < 0) {
    console.error(`Falta columna en sale_items CSV: ${k}`);
    process.exit(1);
  }
}

let customersMap;
let productIds;
try {
  customersMap = await fetchAllCustomerRows(supabase);
  productIds = await fetchProductIdSet(supabase);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const warnings = [];
const saleRows = [];
for (let r = 1; r < salesMatrix.length; r += 1) {
  const row = salesMatrix[r];
  const get = (idx) => (idx >= 0 && idx < row.length ? row[idx] : "");

  const id = compactSpaces(get(SI.id));
  if (!UUID_RE.test(id)) {
    warnings.push(`sales fila ${r + 1}: id inválido`);
    continue;
  }

  const clientId = compactSpaces(get(SI.client_id));
  if (!UUID_RE.test(clientId)) {
    warnings.push(`sales ${id}: client_id inválido`);
    continue;
  }

  const cust = customersMap.get(clientId);
  if (!cust) {
    warnings.push(`sales ${id}: cliente ${clientId} no existe en public.customers — omitida`);
    continue;
  }

  const totalCents = parseMoneyInt(get(SI.total));
  if (totalCents === null) {
    warnings.push(`sales ${id}: total inválido`);
    continue;
  }

  const saleStatus = get(SI.status);
  const orderStatus = mapOrderStatus(saleStatus);

  const emailRaw = cust.email;
  const customerEmail =
    emailRaw.length > 0
      ? emailRaw.toLowerCase()
      : `pos-${String(clientId).slice(0, 8)}@local.invalid`;

  const clientName = compactSpaces(get(SI.client_name)) || cust.name;
  const wompiRef = posWompiReference(id, get(SI.payment_method), salePayTypesBySale);
  const inv = compactSpaces(get(SI.invoice_number));
  const wompiTxn =
    inv.length > 0 ? `LEGACY_INV:${inv.replace(/^#/, "#")}` : `LEGACY_SALE:${id.slice(0, 8)}`;

  const createdAt = parseTimestamptz(get(SI.created_at));
  const updatedAt = parseTimestamptz(get(SI.updated_at));

  let cancellationReason = compactSpaces(get(SI.cancellation_reason));
  if (orderStatus === "cancelled" && !cancellationReason) {
    const ca = compactSpaces(get(SI.cancelled_at));
    cancellationReason = ca ? `Anulada (${ca})` : "Importación legacy";
  } else if (orderStatus !== "cancelled") {
    cancellationReason = null;
  }

  saleRows.push({
    rowNum: r + 1,
    id,
    clientId,
    customer_name: clientName,
    customer_email: customerEmail,
    customer_id: clientId,
    total_cents: totalCents,
    currency: "COP",
    status: orderStatus,
    wompi_reference: wompiRef,
    wompi_transaction_id: wompiTxn,
    cancellation_reason: cancellationReason,
    shipping_address: null,
    shipping_phone: null,
    shipping_city: null,
    shipping_postal_code: null,
    created_at: createdAt,
    updated_at: updatedAt ?? createdAt,
  });
}

const allSaleIds = saleRows.map((s) => s.id);
let existingIds = new Set();
try {
  existingIds = await fetchExistingOrderIds(supabase, allSaleIds);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const toInsert = [];
const toReplace = [];
for (const s of saleRows) {
  if (existingIds.has(s.id)) {
    if (replace) toReplace.push(s);
    continue;
  }
  toInsert.push(s);
}

const ordersSkippedExisting = saleRows.filter(
  (s) => existingIds.has(s.id) && !replace,
).length;

let ordersInserted = 0;
let ordersReplaced = 0;

const ordersReadyForItems = new Set();

const payloadFromSale = (s) => ({
  id: s.id,
  status: s.status,
  customer_email: s.customer_email,
  customer_name: s.customer_name,
  total_cents: s.total_cents,
  currency: s.currency,
  customer_id: s.customer_id,
  wompi_reference: s.wompi_reference,
  wompi_transaction_id: s.wompi_transaction_id,
  cancellation_reason: s.cancellation_reason,
  shipping_address: s.shipping_address,
  shipping_phone: s.shipping_phone,
  shipping_city: s.shipping_city,
  shipping_postal_code: s.shipping_postal_code,
  ...(s.created_at ? { created_at: s.created_at } : {}),
  ...(s.updated_at ? { updated_at: s.updated_at } : {}),
});

for (const part of chunk(toInsert, 120)) {
  const payloads = part.map(payloadFromSale);
  const { data: insData, error } = await supabase.from("orders").insert(payloads).select("id");
  if (!error && insData?.length) {
    for (const r of insData) ordersReadyForItems.add(r.id);
    ordersInserted += insData.length;
  } else if (error) {
    for (const s of part) {
      const { data: one, error: e2 } = await supabase
        .from("orders")
        .insert(payloadFromSale(s))
        .select("id")
        .maybeSingle();
      if (e2) warnings.push(`order ${s.id}: insert — ${e2.message}`);
      else if (one?.id) {
        ordersReadyForItems.add(one.id);
        ordersInserted += 1;
      }
    }
  }
}

for (const s of toReplace) {
  const { error: delErr } = await supabase.from("order_items").delete().eq("order_id", s.id);
  if (delErr) {
    warnings.push(`order ${s.id}: no se pudieron borrar ítems — ${delErr.message}`);
    continue;
  }
  const { error: upErr } = await supabase.from("orders").update(payloadFromSale(s)).eq("id", s.id);
  if (upErr) {
    warnings.push(`order ${s.id}: update — ${upErr.message}`);
    continue;
  }
  ordersReadyForItems.add(s.id);
  ordersReplaced += 1;
}

const itemRowsBySale = new Map();
for (let r = 1; r < itemsMatrix.length; r += 1) {
  const row = itemsMatrix[r];
  const get = (idx) => (idx >= 0 && idx < row.length ? row[idx] : "");

  const saleId = compactSpaces(get(II.sale_id));
  if (!UUID_RE.test(saleId) || !ordersReadyForItems.has(saleId)) continue;

  const itemId = compactSpaces(get(II.id));
  if (!UUID_RE.test(itemId)) {
    warnings.push(`items fila ${r + 1}: id inválido (sale ${saleId})`);
    continue;
  }

  const qty = Math.floor(Number.parseInt(compactSpaces(get(II.quantity)), 10));
  if (!Number.isFinite(qty) || qty <= 0) {
    warnings.push(`item ${itemId}: cantidad inválida`);
    continue;
  }

  const lineTotal = parseMoneyInt(get(II.total));
  const unitCsv = parseMoneyInt(get(II.unit_price));
  let unitCents =
    lineTotal !== null && qty > 0
      ? Math.round(lineTotal / qty)
      : (unitCsv ?? 0);
  if (unitCents === null || !Number.isFinite(unitCents)) unitCents = 0;
  unitCents = Math.max(0, Math.round(unitCents));

  const pid = compactSpaces(get(II.product_id));
  const productId = UUID_RE.test(pid) && productIds.has(pid) ? pid : null;
  if (productId === null && UUID_RE.test(pid)) {
    warnings.push(`item ${itemId}: producto ${pid} no existe — línea sin product_id`);
  }

  let snap = compactSpaces(get(II.product_name));
  if (!snap) snap = "Producto";
  if (snap.length > 400) snap = `${snap.slice(0, 397)}…`;

  const payload = {
    id: itemId,
    order_id: saleId,
    product_id: productId,
    quantity: qty,
    unit_price_cents: unitCents,
    product_name_snapshot: snap,
  };

  if (!itemRowsBySale.has(saleId)) itemRowsBySale.set(saleId, []);
  itemRowsBySale.get(saleId).push(payload);
}

let itemsInserted = 0;
const allItems = [...itemRowsBySale.values()].flat();
for (const part of chunk(allItems, 200)) {
  const { error } = await supabase.from("order_items").insert(part);
  if (error) {
    for (const row of part) {
      const { error: e2 } = await supabase.from("order_items").insert(row);
      if (e2) warnings.push(`order_item ${row.id}: ${e2.message}`);
      else itemsInserted += 1;
    }
  } else {
    itemsInserted += part.length;
  }
}

const salesWithNoLines = [];
for (const sid of ordersReadyForItems) {
  const n = itemRowsBySale.get(sid)?.length ?? 0;
  if (n === 0) salesWithNoLines.push(sid);
}

console.log(
  JSON.stringify(
    {
      salesPath,
      itemsPath,
      salePaymentsPath: existsSync(salePaymentsPath) ? salePaymentsPath : null,
      replace,
      salesParsed: saleRows.length,
      ordersInserted,
      ordersReplaced,
      ordersSkippedExisting,
      itemsInserted,
      salesWithoutItems: salesWithNoLines.length,
      salesWithoutItemsSample: salesWithNoLines.slice(0, 15),
      warnings: warnings.slice(0, 50),
      warningsTotal: warnings.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 50) {
  console.error(`\n(Se omitieron ${warnings.length - 50} avisos adicionales en el JSON.)`);
}
