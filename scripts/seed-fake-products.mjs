#!/usr/bin/env node
/**
 * Carga data/fake-products.json en Supabase (upsert por id).
 * Uso: node scripts/seed-fake-products.mjs
 * Requiere en el entorno: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (o un .env.local en la raíz del repo).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
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

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local o export).",
  );
  process.exit(1);
}

const jsonPath = join(root, "data", "fake-products.json");
const rows = JSON.parse(readFileSync(jsonPath, "utf8"));

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await supabase.from("products").upsert(rows, {
  onConflict: "id",
});

if (error) {
  console.error("Error Supabase:", error.message);
  process.exit(1);
}

console.log(`Listo: ${rows.length} productos demo (upsert por id).`);
console.log("Abrí /products para ver la grilla.");
