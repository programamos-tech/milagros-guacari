#!/usr/bin/env node
/**
 * Crea o actualiza la fila en public.profiles para un usuario de Auth (admin panel).
 * Usa la MISMA URL y SERVICE ROLE que .env.local → si apuntás a local (127.0.0.1),
 * arregla local; si apuntás a la nube, arregla la nube.
 *
 * Requiere:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   npm run admin:link-profile
 *   npm run admin:link-profile -- mp@imports.com
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno / .env.local",
  );
  process.exit(1);
}

const emailArg = process.argv[2]?.trim();
const email =
  emailArg ||
  process.env.NEXT_PUBLIC_PLATFORM_EMAIL?.trim() ||
  "mp@imports.com";

if (!email.includes("@")) {
  console.error("Pasá un correo válido: npm run admin:link-profile -- correo@dominio.com");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail(target) {
  const want = target.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw error;
    }
    const users = data.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === want);
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

try {
  console.log(
    `Supabase: ${url.includes("127.0.0.1") || url.includes("localhost") ? "LOCAL" : "REMOTO"} → ${url}`,
  );
  console.log(`Buscando usuario Auth: ${email}`);

  const user = await findAuthUserByEmail(email);
  if (!user) {
    console.error(
      `\nNo existe un usuario en Authentication con ese correo.\n` +
        `Crealo primero: Supabase → Authentication → Users → Add user (o registro).\n`,
    );
    process.exit(1);
  }

  const row = { id: user.id };

  const { error: upsertErr } = await supabase.from("profiles").upsert(row, {
    onConflict: "id",
  });

  if (upsertErr) {
    console.error("Error en profiles:", upsertErr.message);
    process.exit(1);
  }

  console.log("\nListo. Perfil admin enlazado:");
  console.log(`  id (UUID): ${user.id}`);
  console.log(`  email:     ${user.email ?? "(sin email)"}`);
  console.log("\nProbá de nuevo Iniciar sesión en /admin/login.");
} catch (e) {
  console.error(e?.message ?? e);
  process.exit(1);
}
