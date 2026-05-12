#!/usr/bin/env node
/**
 * Verificación post-migración de ventas: pedidos pagados, líneas, totales y productos con IVA.
 * Usa la misma zona que los reportes (`America/Bogota`) para acotar por día de tienda.
 *
 * Uso:
 *   npm run verify:sales
 *   npm run verify:sales -- --from=2026-04-01 --to=2026-04-30
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TZ = "America/Bogota";
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

function reportDayKeyFromIso(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function parseRangeArgs() {
  let from = null;
  let to = null;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--from=")) from = a.slice(7).trim();
    if (a.startsWith("--to=")) to = a.slice(5).trim();
  }
  return { from, to };
}

function ymdOk(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const { from: rangeFrom, to: rangeTo } = parseRangeArgs();
if ((rangeFrom && !ymdOk(rangeFrom)) || (rangeTo && !ymdOk(rangeTo))) {
  console.error("Usá --from=YYYY-MM-DD y --to=YYYY-MM-DD válidos.");
  process.exit(1);
}
const from = rangeFrom ? rangeFrom : null;
const to = rangeTo ? rangeTo : rangeFrom;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchPaidOrders() {
  const pageSize = 1000;
  let start = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,total_cents,created_at,wompi_reference")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .range(start, start + pageSize - 1);
    if (error) throw new Error(`orders: ${error.message}`);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    start += pageSize;
    if (all.length >= 25_000) {
      console.warn(
        "Límite de 25.000 pedidos pagados leídos; pasá --from/--to para acotar si hace falta.",
      );
      break;
    }
  }
  return all;
}

async function countItemsByOrderIds(ids) {
  const map = new Map();
  for (const part of chunk(ids, 80)) {
    const { data, error } = await supabase
      .from("order_items")
      .select("order_id")
      .in("order_id", part);
    if (error) throw new Error(`order_items: ${error.message}`);
    for (const r of data ?? []) {
      const id = r.order_id;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
  }
  return map;
}

async function productVatStats() {
  const pageSize = 1000;
  let start = 0;
  let withVat = 0;
  let total = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("has_vat")
      .range(start, start + pageSize - 1);
    if (error) throw new Error(`products: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      total += 1;
      if (r.has_vat === true) withVat += 1;
    }
    if (rows.length < pageSize) break;
    start += pageSize;
  }
  return { totalProducts: total, productsWithHasVatTrue: withVat };
}

try {
  const paidAll = await fetchPaidOrders();
  const inRange = paidAll.filter((o) => {
    if (!from) return true;
    const dk = reportDayKeyFromIso(o.created_at);
    if (!dk) return false;
    const end = to ?? from;
    const lo = from <= end ? from : end;
    const hi = from <= end ? end : from;
    return dk >= lo && dk <= hi;
  });

  const ids = inRange.map((o) => o.id);
  const itemCounts = ids.length ? await countItemsByOrderIds(ids) : new Map();

  let sumTotalCents = 0;
  let ordersWithoutLines = 0;
  const noLineSample = [];
  for (const o of inRange) {
    sumTotalCents += Math.max(0, Math.round(Number(o.total_cents ?? 0)));
    const n = itemCounts.get(o.id) ?? 0;
    if (n === 0) {
      ordersWithoutLines += 1;
      if (noLineSample.length < 12) noLineSample.push(o.id);
    }
  }

  const vat = await productVatStats();

  const report = {
    timeZone: TZ,
    rangeFilter: from ? { from, to: to ?? from } : null,
    paidOrdersInScope: inRange.length,
    paidOrdersTotalInDb: paidAll.length,
    sumTotalCentsInScope: sumTotalCents,
    ordersWithoutOrderItems: ordersWithoutLines,
    ordersWithoutOrderItemsSample: noLineSample,
    products: vat,
    checks: {
      allPaidOrdersHaveLines:
        ordersWithoutLines === 0
          ? "ok"
          : "falla: hay pedidos pagados sin filas en order_items (IVA y neto por línea no se podrán calcular bien)",
      vatConfigurable:
        vat.productsWithHasVatTrue > 0
          ? "ok (al menos un producto con has_vat)"
          : "aviso: ningún producto con has_vat=true → IVA recaudado en reportes será 842 salvo lógica POS",
    },
  };

  console.log(JSON.stringify(report, null, 2));
  if (ordersWithoutLines > 0) process.exitCode = 1;
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
