#!/usr/bin/env node
/**
 * Importa colaboradores desde users_rows.csv → Auth + public.profiles.
 *
 * - Contraseña: la misma para todos (por defecto `admin123` o IMPORT_USER_PASSWORD / argv).
 * - UUID del CSV se respeta al crear usuario (GoTrue acepta `id` en createUser).
 * - Rol CSV `superadmin` → job_role `owner` (todos los permisos). `vendedor` → `cashier` (plantilla cajero).
 * - Permisos JSON del CSV no se interpretan; se usan las plantillas del panel (lib/admin-permissions).
 *
 * Uso:
 *   npm run import:users
 *   node scripts/import-users-from-csv.mjs /ruta/users_rows.csv
 *   IMPORT_USER_PASSWORD=otra node scripts/import-users-from-csv.mjs
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

/** Debe coincidir con lib/admin-permissions.ts (PERMISSION_KEYS + plantillas). */
const PERMISSION_KEYS = [
  "inicio_reportes",
  "ventas_ver",
  "ventas_crear",
  "clientes_ver",
  "clientes_crear",
  "clientes_editar",
  "egresos_ver",
  "egresos_crear",
  "proveedores_ver",
  "inventario_ver",
  "productos_crear",
  "productos_editar",
  "categorias_gestionar",
  "stock_actualizar",
  "stock_transferir",
  "roles_ver",
  "colaboradores_gestionar",
  "sucursales_ver",
  "sucursales_gestionar",
  "actividades_ver",
  "marketing_ver",
  "ajustes_tienda_ver",
];

function defaultPermissionsOwner() {
  const m = {};
  for (const k of PERMISSION_KEYS) m[k] = true;
  return m;
}

function defaultPermissionsCashier() {
  const m = {};
  for (const k of PERMISSION_KEYS) m[k] = false;
  m.inicio_reportes = true;
  m.ventas_ver = true;
  m.ventas_crear = true;
  m.clientes_ver = true;
  m.clientes_crear = true;
  m.clientes_editar = true;
  m.egresos_ver = true;
  m.egresos_crear = true;
  m.proveedores_ver = true;
  m.inventario_ver = true;
  m.actividades_ver = true;
  m.marketing_ver = false;
  m.ajustes_tienda_ver = false;
  return m;
}

function permissionsFromRoleTemplate(jobRole) {
  if (jobRole === "owner") return defaultPermissionsOwner();
  return defaultPermissionsCashier();
}

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

/** Igual que lib/collaborator-utils slugUsername */
function slugUsername(name) {
  const base = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32)
    .trim();
  return base.length > 0 ? base : "usuario";
}

function emailLocalKey(email) {
  const local = (email.split("@")[0] ?? "user").replace(/\./g, "");
  return slugUsername(local);
}

function csvRoleToJobRole(roleRaw) {
  const r = compactSpaces(roleRaw).toLowerCase();
  if (r === "superadmin" || r === "admin" || r === "owner") return "owner";
  if (r === "vendedor" || r === "cashier" || r === "cajero") return "cashier";
  return "cashier";
}

function parseBool(s) {
  const t = compactSpaces(String(s)).toLowerCase();
  return t === "true" || t === "1" || t === "t";
}

async function loadAuthUserIndex(supabase) {
  const byId = new Map();
  const byEmail = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data.users ?? [];
    for (const u of users) {
      byId.set(u.id, u);
      if (u.email) byEmail.set(String(u.email).toLowerCase(), u);
    }
    if (users.length < 200) break;
    page += 1;
    if (page > 50) break;
  }
  return { byId, byEmail };
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

const password =
  process.argv[3]?.trim() ||
  process.env.IMPORT_USER_PASSWORD?.trim() ||
  "admin123";

if (password.length < 6) {
  console.error("La contraseña debe tener al menos 6 caracteres.");
  process.exit(1);
}

const csvArg = process.argv[2]?.trim();
const csvPath = csvArg ? resolve(process.cwd(), csvArg) : join(root, "users_rows.csv");

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
  email: col("email"),
  name: col("name"),
  role: col("role"),
  is_active: col("is_active"),
};
for (const [k, v] of Object.entries(I)) {
  if (v < 0) {
    console.error(`Falta columna en el CSV: ${k}`);
    process.exit(1);
  }
}

const { byId, byEmail } = await loadAuthUserIndex(supabase);

let created = 0;
let updated = 0;
let skipped = 0;
const warnings = [];

for (let r = 1; r < matrix.length; r += 1) {
  const row = matrix[r];
  const get = (idx) => (idx >= 0 && idx < row.length ? row[idx] : "");

  const id = compactSpaces(get(I.id));
  const email = compactSpaces(get(I.email)).toLowerCase();
  const displayName = compactSpaces(get(I.name)) || email.split("@")[0] || "Usuario";
  const jobRole = csvRoleToJobRole(get(I.role));
  const isActive = get(I.is_active) === "" ? true : parseBool(get(I.is_active));

  if (!UUID_RE.test(id)) {
    warnings.push(`Fila ${r + 1}: id inválido (${id}), omitida.`);
    skipped += 1;
    continue;
  }
  if (!email.includes("@")) {
    warnings.push(`Fila ${r + 1}: email inválido, omitida.`);
    skipped += 1;
    continue;
  }

  let loginUsername = emailLocalKey(email);
  const { data: dupOther } = await supabase
    .from("profiles")
    .select("id")
    .eq("login_username", loginUsername)
    .neq("id", id)
    .maybeSingle();
  if (dupOther?.id) {
    loginUsername = `${loginUsername}${String(r).padStart(2, "0")}`.slice(0, 32);
  }

  const permissions = permissionsFromRoleTemplate(jobRole);
  const existingById = byId.get(id);
  const existingByEmail = byEmail.get(email);

  if (existingByEmail && existingByEmail.id !== id) {
    warnings.push(
      `Fila ${r + 1} (${email}): ya existe otro usuario Auth con ese correo (id ${existingByEmail.id} ≠ CSV ${id}). Omitida.`,
    );
    skipped += 1;
    continue;
  }

  if (existingById && String(existingById.email ?? "").toLowerCase() !== email) {
    warnings.push(
      `Fila ${r + 1}: el id ${id} ya está ocupado por otro correo. Omitida.`,
    );
    skipped += 1;
    continue;
  }

  const meta = {
    display_name: displayName,
    login_username: loginUsername,
  };

  let effectiveId = id;
  let authCreated = false;

  if (existingById) {
    const { error: uErr } = await supabase.auth.admin.updateUserById(id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { ...existingById.user_metadata, ...meta },
    });
    if (uErr) {
      warnings.push(`Fila ${r + 1} (${email}): update Auth — ${uErr.message}`);
      skipped += 1;
      continue;
    }
  } else {
    const payload = {
      id,
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    };
    const { data: cData, error: cErr } = await supabase.auth.admin.createUser(payload);
    if (cErr) {
      warnings.push(`Fila ${r + 1} (${email}): create Auth — ${cErr.message}`);
      skipped += 1;
      continue;
    }
    if (!cData?.user?.id) {
      warnings.push(`Fila ${r + 1} (${email}): create Auth sin user.id`);
      skipped += 1;
      continue;
    }
    effectiveId = cData.user.id;
    if (effectiveId !== id) {
      warnings.push(
        `Fila ${r + 1} (${email}): Auth creó id ${effectiveId} (CSV pedía ${id}). El perfil se guarda con el id real.`,
      );
    }
    authCreated = true;
    byId.set(effectiveId, cData.user);
    byEmail.set(email, cData.user);
  }

  const profileRow = {
    id: effectiveId,
    role: "admin",
    display_name: displayName,
    login_username: loginUsername,
    public_email: email,
    job_role: jobRole,
    branch_label: null,
    permissions,
    avatar_variant: "A",
    is_active: isActive,
  };

  const { error: pErr } = await supabase.from("profiles").upsert(profileRow, {
    onConflict: "id",
  });
  if (pErr) {
    warnings.push(`Fila ${r + 1} (${email}): profiles upsert — ${pErr.message}`);
    if (authCreated) {
      await supabase.auth.admin.deleteUser(effectiveId);
    }
    skipped += 1;
    continue;
  }

  if (existingById) updated += 1;
  else created += 1;
}

console.log(
  JSON.stringify(
    {
      csvPath,
      passwordLength: password.length,
      created,
      updated,
      skipped,
      warnings: warnings.slice(0, 30),
      warningsTotal: warnings.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 30) {
  console.error(`\n(Se omitieron ${warnings.length - 30} avisos en consola; ver warningsTotal.)`);
}
