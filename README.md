# Milagros Guacarí

Tienda con **Next.js**, **Tailwind**, **Supabase** (Postgres, Auth, Storage) y **Wompi**. Repo independiente; base local en puertos propios (`57520–57529`) para no interferir con otros proyectos Supabase en la misma máquina.

## Requisitos

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker (para `supabase start` local)
- Cuenta [Wompi](https://wompi.co) (sandbox o producción) cuando vayas a cobrar

## Base de datos local (desde cero)

1. `cp .env.example .env.local` (dejá las claves vacías hasta el paso 3).
2. `supabase start` — levanta Postgres y API en **57521** (ver `supabase status`).
3. `supabase db reset` — aplica todas las migraciones en orden sobre una base **vacía**.
4. Pegá en `.env.local` la **URL** y las dos **keys** que muestra `supabase status`.
5. Creá usuario en Auth (Studio `http://127.0.0.1:57523` o SQL) y enlazá admin:

   ```sql
   insert into public.profiles (id, role)
   values ('UUID_DEL_USUARIO_AUTH', 'admin');
   ```

6. `npm install` y `npm run dev`. Si el puerto 3000 está ocupado por otra tienda: `npm run dev:alt` (3001).

## Configuración rápida (remoto o resumen)

1. Nuevo repositorio y clone en tu máquina.
2. `cp .env.example .env.local` y completa Supabase, `NEXT_PUBLIC_SITE_URL`, Wompi.
3. En Supabase → **SQL Editor**, ejecuta las migraciones en orden (o `supabase db push`): [`20260505190000_init.sql`](supabase/migrations/20260505190000_init.sql), luego envíos, categorías y **stock bodega/local** ([`20260508130000_product_stock_split.sql`](supabase/migrations/20260508130000_product_stock_split.sql)) para inventario en dos ubicaciones.
4. **Auth**: en Supabase → **Authentication → Users** crea un usuario (correo y contraseña que quieras). **No hay usuario precargado** en la plantilla.
5. **Admin**: copia el **UUID** de ese usuario (columna *User UID*) y en **SQL Editor** enlázalo al panel:

   ```sql
   insert into public.profiles (id, role)
   values ('UUID_DEL_USUARIO_AUTH', 'admin');
   ```

   Inicia sesión en `/admin/login` con el **mismo correo y contraseña** que definiste en el paso 4.

6. **Wompi**: en el panel de Wompi configura la URL de eventos (webhook) apuntando a:

   `https://TU_DOMINIO/api/webhooks/wompi`

7. `npm install` y `npm run dev`.

## Flujo

- **Tienda**: `/`, `/products`, carrito en cookie, `/checkout` crea el pedido y redirige al **link de pago** Wompi.
- **Retorno**: `/checkout/return?order_id=...` muestra el estado (el definitivo llega por webhook).
- **Admin**: `/admin` (Supabase Auth + fila en `profiles`).

## Checklist por nuevo cliente

- [ ] Nuevo proyecto Supabase + migración aplicada.
- [ ] Bucket `product-images` creado por la migración; revisa las políticas si algo falla.
- [ ] Usuario admin + `profiles`.
- [ ] Variables en Vercel (o hosting): Supabase, `NEXT_PUBLIC_SITE_URL`, claves Wompi.
- [ ] Webhook Wompi a `/api/webhooks/wompi`.
- [ ] `NEXT_PUBLIC_STORE_NAME` y tema (Tailwind / `globals.css`).

## Notas

- El campo `price_cents` en base de datos guarda **pesos COP enteros** (sin decimales).
- Si la verificación de firma del webhook falla, deja `WOMPI_INTEGRITY_SECRET` vacío en desarrollo o ajusta la lógica según la documentación actual de Wompi.
- La página de retorno del checkout usa la **service role** en servidor solo para leer el pedido por `order_id`; en un hardening futuro podrías firmar un token o usar sesión de comprador.

## Scripts

- `npm run dev` — desarrollo (puerto 3000)
- `npm run dev:alt` — desarrollo en puerto **3001** (si otra app ya usa 3000)
- `npm run build` — producción
- `npm run lint` — ESLint

## Crear el repositorio remoto (GitHub)

En la carpeta del proyecto (ya con `git init` y primer commit):

```bash
gh repo create milagros-guacari --private --source=. --remote=origin --push
```

Sin GitHub CLI: creá el repo vacío en la web y luego `git remote add origin git@github.com:TU_ORG/milagros-guacari.git` y `git push -u origin main`.
