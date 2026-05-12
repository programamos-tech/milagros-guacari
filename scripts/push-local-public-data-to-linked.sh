#!/usr/bin/env bash
# Migra datos desde Supabase local (`supabase start`) al proyecto ENLAZADO (`supabase link`).
#
# Incluye:
#   1) Esquema auth — usuarios, identidades y entradas de auditoría (mismos UUID que en local).
#      Sin esto, `public.profiles` y el login no cuadran con producción.
#   2) Esquema public — categorías, productos, clientes, pedidos, cupones, proveedores, etc.
#
# Requisitos: supabase CLI, local en marcha, psql **o** Docker (imagen postgres:17-alpine), contraseña BD remota.
#
# Uso (desde la raíz del repo):
#   SUPABASE_DB_PASSWORD='tu_database_password' ./scripts/push-local-public-data-to-linked.sh
#
# Solo datos de negocio (no tocar Auth en producción; p. ej. ya invitaste usuarios allí):
#   SKIP_AUTH=1 SUPABASE_DB_PASSWORD='…' ./scripts/push-local-public-data-to-linked.sh
#
# Contraseña: Dashboard → Project Settings → Database → Database password.
#
# Notas:
#   - Pensado para una BD remota recién migrada (sin filas). Si ya hay datos, pueden chocar PK.
#   - Imágenes en Storage: este script no copia blobs; si hace falta, sincronizá buckets aparte.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Leer solo SUPABASE_DB_PASSWORD desde .env.local (no hacer source del archivo: puede romper con espacios sin comillas).
load_supabase_db_password_from_dotenv() {
  REPO_ROOT="$ROOT" python3 <<'PY'
import os, pathlib, sys
root = pathlib.Path(os.environ["REPO_ROOT"])
p = root / ".env.local"
if not p.is_file():
    sys.exit(0)
text = p.read_text(encoding="utf-8", errors="replace")
for raw in text.splitlines():
    s = raw.strip()
    if not s.startswith("SUPABASE_DB_PASSWORD="):
        continue
    v = s.split("=", 1)[1].strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
        v = v[1:-1]
    sys.stdout.write(v)
    break
PY
}

if [[ -z "${SUPABASE_DB_PASSWORD:-}" && -f "${ROOT}/.env.local" ]]; then
  _pw="$(load_supabase_db_password_from_dotenv)"
  if [[ -n "${_pw}" ]]; then
    export SUPABASE_DB_PASSWORD="${_pw}"
  fi
  unset _pw
fi

mkdir -p "${ROOT}/supabase/.temp"
WORKDIR="$(mktemp -d "${ROOT}/supabase/.temp/migrate-data.XXXXXX")"
trap 'rm -rf "$WORKDIR"' EXIT

# psql local, o Docker (volume bajo el repo para compatibilidad con Docker Desktop).
run_psql_file() {
  local f="$1"
  local abs
  abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
  if command -v psql >/dev/null 2>&1; then
    psql -v ON_ERROR_STOP=1 -f "$f"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm -i \
      -e PGHOST="$PGHOST" \
      -e PGPORT="$PGPORT" \
      -e PGUSER="$PGUSER" \
      -e PGDATABASE="$PGDATABASE" \
      -e PGSSLMODE="$PGSSLMODE" \
      -e PGPASSWORD="$PGPASSWORD" \
      -v "${abs}:/tmp/migrate.sql:ro" \
      postgres:17-alpine \
      psql -v ON_ERROR_STOP=1 -f /tmp/migrate.sql
  else
    echo "Falta psql (p. ej. brew install libpq) o Docker para conectar a la base remota."
    exit 1
  fi
}

REF_FILE="supabase/.temp/project-ref"
if [[ ! -f "$REF_FILE" ]]; then
  echo "No encuentro $REF_FILE. Ejecutá: supabase link --project-ref <TU_REF>"
  exit 1
fi

REF="$(tr -d '[:space:]' < "$REF_FILE")"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Falta SUPABASE_DB_PASSWORD (contraseña de Postgres del proyecto)."
  echo "Dashboard → Project Settings → Database → Database password."
  echo "Agregá en .env.local (solo en tu máquina): SUPABASE_DB_PASSWORD='…' y volvé a ejecutar este script."
  exit 1
fi

export PGPORT="5432"
export PGDATABASE="postgres"
export PGSSLMODE="require"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"

# Preferir pooler (IPv4 estable desde Docker); si no hay pooler-url, conexión directa a db.
POOLER_FILE="${ROOT}/supabase/.temp/pooler-url"
if [[ -f "$POOLER_FILE" ]]; then
  POOLER="$(tr -d '[:space:]' < "$POOLER_FILE")"
  if [[ "$POOLER" =~ ^postgresql://([^@]+)@([^:/]+):([0-9]+)/ ]]; then
    export PGUSER="${BASH_REMATCH[1]}"
    export PGHOST="${BASH_REMATCH[2]}"
    export PGPORT="${BASH_REMATCH[3]}"
  fi
else
  export PGUSER="postgres"
  export PGHOST="db.${REF}.supabase.co"
fi

AUTH_SQL="${WORKDIR}/auth_data.sql"
PUBLIC_SQL="${WORKDIR}/public_data.sql"

if [[ "${SKIP_AUTH:-}" != "1" ]]; then
  echo "Volcando auth desde local → ${AUTH_SQL}"
  supabase db dump --local --data-only --schema auth -f "$AUTH_SQL"
  echo "Aplicando auth en remoto…"
  run_psql_file "$AUTH_SQL"
else
  echo "SKIP_AUTH=1 → no se vuelca ni aplica el esquema auth."
fi

echo "Volcando public desde local → ${PUBLIC_SQL}"
supabase db dump --local --data-only --schema public -f "$PUBLIC_SQL"

echo "Aplicando public en remoto (productos, clientes, ventas, perfiles, …)…"
run_psql_file "$PUBLIC_SQL"

echo "Listo: datos de local aplicados en producción (ref ${REF})."
