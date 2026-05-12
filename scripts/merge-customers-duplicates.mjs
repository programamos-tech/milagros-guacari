#!/usr/bin/env node
/**
 * Unifica clientes duplicados en public.customers.
 *
 * Criterios (misma persona si cumple cualquiera):
 *   - Mismo documento normalizado (solo dígitos, mínimo 6), alineado con normalize_document_id en DB.
 *   - Mismo email normalizado lower(trim), no vacío.
 *   - Documento “placeholder” de un solo dígito repetido (ej. 77777777 y 7777777777): se agrupan
 *     por ese dígito (solo filas con ≥6 dígitos iguales), típico de “cliente final” genérico.
 *
 * Se conectan componentes: si A≡B por doc y B≡C por email, A,B,C van al mismo grupo.
 *
 * Reglas por grupo:
 *   - Titular (se conserva el id): fila con created_at más antigua.
 *   - Pedidos (orders.customer_id) y direcciones (customer_addresses) pasan al titular.
 *   - Se rellenan campos vacíos del titular con datos de los duplicados (tel, dirección, notas, etc.).
 *   - Si hay más de un auth_user_id distinto en el grupo → no se toca (revisión manual).
 *   - auth_user_id: si solo un duplicado tiene cuenta tienda, se mueve al titular (tras limpiar en duplicados).
 *
 * Por defecto solo muestra plan (dry-run). Para aplicar:
 *   npm run merge:customers-duplicates -- --execute
 *
 * Merge manual (titular conserva id; absorb se elimina):
 *   npm run merge:customers-duplicates -- --merge=KEEPER_UUID:ABSORB_UUID --execute
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

function normalizeDoc(p) {
  const d = String(p ?? "")
    .trim()
    .replace(/\D/g, "");
  return d.length >= 6 ? d : null;
}

function normalizeEmail(e) {
  const t = String(e ?? "").trim().toLowerCase();
  return t.length > 0 ? t : null;
}

/** Ej. 77777777 y 7777777777 → mismo bucket (dígito 7). Solo si ≥6 dígitos y todos iguales. */
function sameDigitPlaceholderBucket(p) {
  const d = String(p ?? "")
    .trim()
    .replace(/\D/g, "");
  if (d.length < 6) return null;
  if (!/^(\d)\1+$/.test(d)) return null;
  return d[0];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

class UnionFind {
  /** @type {Map<string, string>} */
  parent = new Map();

  /** @param {string} a */
  find(a) {
    if (!this.parent.has(a)) this.parent.set(a, a);
    let p = /** @type {string} */ (this.parent.get(a));
    if (p !== a) {
      p = this.find(p);
      this.parent.set(a, p);
    }
    return p;
  }

  /** @param {string} a @param {string} b */
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }

  /** @param {string[]} allIds */
  duplicateGroups(allIds) {
    const byRoot = new Map();
    for (const id of allIds) {
      const r = this.find(id);
      if (!byRoot.has(r)) byRoot.set(r, []);
      byRoot.get(r).push(id);
    }
    return [...byRoot.values()].filter((g) => g.length > 1);
  }
}

function pickKeeper(members, byId) {
  return [...members].sort((a, b) => {
    const ca = new Date(byId.get(a).created_at ?? 0).getTime();
    const cb = new Date(byId.get(b).created_at ?? 0).getTime();
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  })[0];
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const t = String(v ?? "").trim();
    if (t.length > 0) return t;
  }
  return null;
}

/** Solo rellena vacíos en el titular; las notas de duplicados se anexan. */
function mergeCustomerPatch(keeperRow, others) {
  /** @type {Record<string, unknown>} */
  const patch = {};
  const k = keeperRow;

  if (!String(k.name ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.name));
    if (v) patch.name = v;
  }
  if (!String(k.email ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.email));
    if (v) patch.email = v.trim().toLowerCase();
  }
  if (!String(k.phone ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.phone));
    if (v) patch.phone = v;
  }
  if (!String(k.document_id ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.document_id));
    if (v) patch.document_id = v;
  }
  if (!String(k.shipping_address ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.shipping_address));
    if (v) patch.shipping_address = v;
  }
  if (!String(k.shipping_city ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.shipping_city));
    if (v) patch.shipping_city = v;
  }
  if (!String(k.shipping_postal_code ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.shipping_postal_code));
    if (v) patch.shipping_postal_code = v;
  }

  const extraNotes = others.map((o) => String(o.notes ?? "").trim()).filter(Boolean);
  if (extraNotes.length) {
    const base = String(k.notes ?? "").trim();
    patch.notes = base ? `${base}\n---\n${extraNotes.join("\n---\n")}` : extraNotes.join("\n---\n");
  }

  if ("birth_date" in k && !String(k.birth_date ?? "").trim()) {
    const v = firstNonEmpty(...others.map((o) => o.birth_date));
    if (v) patch.birth_date = v;
  }

  return patch;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const execute = process.argv.includes("--execute");

if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local o export).",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAllCustomers() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id,name,email,phone,document_id,source,created_at,auth_user_id,shipping_address,shipping_city,shipping_postal_code,notes,birth_date",
      )
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      const { data: data2, error: err2 } = await supabase
        .from("customers")
        .select(
          "id,name,email,phone,document_id,source,created_at,auth_user_id,shipping_address,shipping_city,shipping_postal_code,notes",
        )
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (err2) throw new Error(err2.message);
      all.push(...(data2 ?? []));
      if ((data2 ?? []).length < pageSize) break;
      from += pageSize;
      continue;
    }
    all.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function mergeOneGroup(keeperId, absorbIds, byId) {
  const keeper = byId.get(keeperId);
  if (!keeper) return { ok: false, error: "keeper missing" };
  const others = absorbIds.map((id) => byId.get(id)).filter(Boolean);
  const authIds = [keeper.auth_user_id, ...others.map((o) => o.auth_user_id)]
    .filter(Boolean)
    .map(String);
  const uniqAuth = [...new Set(authIds)];
  if (uniqAuth.length > 1) {
    return { ok: false, error: "Varias cuentas Auth distintas en el mismo grupo" };
  }

  const patch = mergeCustomerPatch(keeper, others);
  if (Object.keys(patch).length > 0) {
    const { error: pe } = await supabase.from("customers").update(patch).eq("id", keeperId);
    if (pe) return { ok: false, error: `update keeper: ${pe.message}` };
  }

  for (const part of chunk(absorbIds, 40)) {
    const { error: oe } = await supabase.from("orders").update({ customer_id: keeperId }).in("customer_id", part);
    if (oe) return { ok: false, error: `orders: ${oe.message}` };
  }

  for (const part of chunk(absorbIds, 40)) {
    const { error: ae } = await supabase
      .from("customer_addresses")
      .update({ customer_id: keeperId })
      .in("customer_id", part);
    if (ae) return { ok: false, error: `addresses: ${ae.message}` };
  }

  const absorbedAuth = uniqAuth[0] ?? null;
  const keeperAuth = keeper.auth_user_id ? String(keeper.auth_user_id) : null;
  if (!keeperAuth && absorbedAuth) {
    for (const id of absorbIds) {
      await supabase.from("customers").update({ auth_user_id: null }).eq("id", id);
    }
    const { error: authErr } = await supabase
      .from("customers")
      .update({ auth_user_id: absorbedAuth })
      .eq("id", keeperId);
    if (authErr) return { ok: false, error: `auth move: ${authErr.message}` };
  }

  for (const id of absorbIds) {
    const { error: de } = await supabase.from("customers").delete().eq("id", id);
    if (de) return { ok: false, error: `delete ${id}: ${de.message}` };
  }

  return { ok: true };
}

try {
  const mergeArg = process.argv.find((a) => a.startsWith("--merge="));
  if (mergeArg) {
    if (!execute) {
      console.error("Con --merge=… tenés que pasar también --execute.");
      process.exit(1);
    }
    const pair = mergeArg.slice("--merge=".length).trim();
    const [keeperId, absorbId] = pair.split(":").map((s) => s.trim());
    if (!keeperId || !absorbId || !UUID_RE.test(keeperId) || !UUID_RE.test(absorbId)) {
      console.error("Uso: --merge=KEEPER_UUID:ABSORB_UUID --execute");
      process.exit(1);
    }
    if (keeperId === absorbId) {
      console.error("KEEPER y ABSORB deben ser distintos.");
      process.exit(1);
    }
    const customers = await fetchAllCustomers();
    const byId = new Map(customers.map((c) => [c.id, c]));
    if (!byId.has(keeperId) || !byId.has(absorbId)) {
      console.error("Uno de los UUID no existe en public.customers.");
      process.exit(1);
    }
    const res = await mergeOneGroup(keeperId, [absorbId], byId);
    console.log(
      JSON.stringify(
        {
          manualMerge: true,
          keeperId,
          absorbId,
          keeperName: byId.get(keeperId)?.name,
          absorbName: byId.get(absorbId)?.name,
          ok: res.ok,
          error: res.ok ? undefined : res.error,
        },
        null,
        2,
      ),
    );
    process.exit(res.ok ? 0 : 1);
  }

  const customers = await fetchAllCustomers();
  const byId = new Map(customers.map((c) => [c.id, c]));
  const allIds = customers.map((c) => c.id);

  const uf = new UnionFind();
  for (const id of allIds) uf.find(id);

  const docBuckets = new Map();
  for (const c of customers) {
    const d = normalizeDoc(c.document_id);
    if (!d) continue;
    if (!docBuckets.has(d)) docBuckets.set(d, []);
    docBuckets.get(d).push(c.id);
  }
  for (const ids of docBuckets.values()) {
    for (let i = 1; i < ids.length; i += 1) uf.union(ids[0], ids[i]);
  }

  const emailBuckets = new Map();
  for (const c of customers) {
    const em = normalizeEmail(c.email);
    if (!em) continue;
    if (!emailBuckets.has(em)) emailBuckets.set(em, []);
    emailBuckets.get(em).push(c.id);
  }
  for (const ids of emailBuckets.values()) {
    for (let i = 1; i < ids.length; i += 1) uf.union(ids[0], ids[i]);
  }

  const placeholderBuckets = new Map();
  for (const c of customers) {
    const digit = sameDigitPlaceholderBucket(c.document_id);
    if (!digit) continue;
    if (!placeholderBuckets.has(digit)) placeholderBuckets.set(digit, []);
    placeholderBuckets.get(digit).push(c.id);
  }
  for (const ids of placeholderBuckets.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i += 1) uf.union(ids[0], ids[i]);
  }

  const groups = uf.duplicateGroups(allIds);
  const plans = [];

  for (const members of groups) {
    const keeperId = pickKeeper(members, byId);
    const absorb = members.filter((id) => id !== keeperId);
    const keeper = byId.get(keeperId);
    const names = members.map((id) => byId.get(id)?.name).join(" | ");
    const docs = [...new Set(members.map((id) => normalizeDoc(byId.get(id)?.document_id)).filter(Boolean))];
    const emails = [...new Set(members.map((id) => normalizeEmail(byId.get(id)?.email)).filter(Boolean))];
    plans.push({ keeperId, absorb, keeperName: keeper?.name, names, docs, emails });
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        customersTotal: customers.length,
        duplicateGroups: plans.length,
        groups: plans.map((p) => ({
          keeper: p.keeperId,
          absorb: p.absorb,
          keeperName: p.keeperName,
          docs: p.docs,
          emails: p.emails,
        })),
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.error(
      "\nModo simulación. Para fusionar en la base de datos ejecutá:\n  npm run merge:customers-duplicates -- --execute\n",
    );
    process.exit(0);
  }

  let merged = 0;
  const errors = [];
  for (const p of plans) {
    const res = await mergeOneGroup(p.keeperId, p.absorb, byId);
    if (!res.ok) {
      errors.push({ keeper: p.keeperId, error: res.error });
      continue;
    }
    merged += 1;
    for (const id of p.absorb) byId.delete(id);
  }

  console.log(
    JSON.stringify(
      {
        mergedGroups: merged,
        errors,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
