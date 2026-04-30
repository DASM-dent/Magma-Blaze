# Deploy Magma Blaze: Supabase + Cloudflare

## 1. Supabase

El proyecto usa Prisma con PostgreSQL. En Supabase, usa:

```env
DATABASE_URL="postgresql://postgres.qhowrtbzescengnbfwvz:YOUR_SUPABASE_DB_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.qhowrtbzescengnbfwvz:YOUR_SUPABASE_DB_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

`DATABASE_URL` es para la API en runtime. `DIRECT_URL` es para Prisma cuando sincroniza/migra schema.

No subas `.env` a GitHub. Usa `.env.production.example` como referencia.

## 2. Crear tablas y seed

Despues de poner la password real en `apps/api/.env`:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run build
```

Si Prisma muestra `P1013 invalid port number`, tu password tiene caracteres especiales y debe ir codificada en la URL. Ejecuta este script desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-supabase-env.ps1
```

El script te pedira la password en tu terminal, la codificara y actualizara `apps/api/.env` sin que tengas que pegarla en ningun chat.

Luego prueba:

```bash
npm run dev
```

Abre:

- Frontend: http://localhost:3000
- API: http://localhost:4000/health
- Panel real: http://localhost:3000/dixnissowner
- Trampa: http://localhost:3000/admin

La ruta `/admin` no es el panel real. Es una trampa de seguridad: al segundo intento desde la misma IP, se bloquea esa IP durante los dias definidos por `ADMIN_TRAP_BAN_DAYS`.

Configura el mismo `ADMIN_TRAP_SECRET` en Cloudflare y en el host de la API. Asi el endpoint `/security/admin-trap` solo acepta registros enviados por tu propia web.

## 3. Backend API

La API actual es Express, por eso no se sube a Supabase directamente.

Recomendado:

- Render, Railway o Fly.io para la API.
- Dominio: `api.magmablaze.com`.
- Variables de produccion: las de `.env.production.example`.

## 4. Frontend Cloudflare

Recomendado:

- Subir el proyecto a GitHub.
- Conectar Cloudflare al repo.
- Configurar `NEXT_PUBLIC_API_URL=https://api.magmablaze.com`.
- Configurar dominio `magmablaze.com` y `www.magmablaze.com`.

## 5. DNS

En Cloudflare:

- `magmablaze.com` -> frontend.
- `www.magmablaze.com` -> frontend.
- `api.magmablaze.com` -> API Express en Render/Railway/Fly.

## 6. Pendiente para storage

Cuando la base este funcionando, crea buckets en Supabase Storage:

- `product-images`
- `model-photos`
- `cms-images`

Despues se conecta el panel admin para subir archivos reales en vez de guardar imagenes base64.
