# La Barbería — Web de reservas

Web de reservas online para La Barbería, hecha con React + Vite y Supabase como base de datos.
Funciona perfectamente en el móvil (es donde la mayoría de tus clientes la van a usar).

## Antes de nada: 2 cosas que tienes que cambiar

Abre `src/App.jsx` y edita estas líneas (arriba del todo):

```js
const SALON\\\\\\\_WHATSAPP = "34600000000"; // tu número real, sin '+' ni espacios
const SALON\\\\\\\_EMAIL = "hola@labarberia.example"; // tu email real
```

Y si quieres tocar los servicios o precios, edita el array `SERVICES` un poco más abajo en el mismo archivo.

\---

## Paso 1 — Crear la base de datos en Supabase (gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (elige la región más cercana, ej. Europa).
3. Cuando esté listo, ve a **SQL Editor** (menú lateral) → **New query**, pega esto y pulsa **Run**:

```sql
create table bookings (
  id uuid primary key default gen\\\\\\\_random\\\\\\\_uuid(),
  date text not null,
  date\\\\\\\_label text not null,
  start\\\\\\\_minutes integer not null,
  time\\\\\\\_label text not null,
  duration integer not null,
  service\\\\\\\_id text not null,
  service\\\\\\\_name text not null,
  price numeric not null,
  name text not null,
  phone text not null,
  created\\\\\\\_at timestamptz default now()
);

alter table bookings enable row level security;

create policy "Cualquiera puede reservar" on bookings
  for insert to anon with check (true);

create policy "Cualquiera puede ver las reservas" on bookings
  for select to anon using (true);

create policy "Cualquiera puede borrar reservas" on bookings
  for delete to anon using (true);
```

> ⚠️ Nota de seguridad: estas políticas son permisivas a propósito, para que la demo funcione
> sin necesidad de login. Cualquiera con el enlace de tu web (no solo el panel) podría, en
> teoría, borrar una reserva llamando directamente a la API de Supabase. Para un negocio real
> a largo plazo, lo correcto es añadir Supabase Auth y restringir `delete`/`select` completo
> a un usuario autenticado (el dueño). Es un paso que podemos hacer más adelante si quieres
> reforzarlo.

4. Ve a **Project Settings** (icono de engranaje) → **API**. Copia:

   * **Project URL**
   * **anon public key**

## Paso 2 — Configurar el proyecto en tu ordenador

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
cd la-barberia-web
npm install
cp .env.example .env
```

Abre el archivo `.env` que se acaba de crear y pega ahí la URL y la clave que copiaste de Supabase:

```
VITE\\\\\\\_SUPABASE\\\\\\\_URL=https://tuproyecto.supabase.co
VITE\\\\\\\_SUPABASE\\\\\\\_ANON\\\\\\\_KEY=tu-clave-anonima-publica
VITE\\\\\\\_ADMIN\\\\\\\_PIN=0000
```

Cambia `VITE\\\\\\\_ADMIN\\\\\\\_PIN` por un PIN propio de 4-6 dígitos para el panel del negocio.

## Paso 3 — Probarlo en local

```bash
npm run dev
```

Abre la URL que te muestre la terminal (normalmente `http://localhost:5173`). Pruébalo también
desde el móvil: en la misma red wifi, usa la IP que te muestre Vite en vez de "localhost".

## Paso 4 — Subir el código a GitHub

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Crea un repositorio nuevo (puede ser privado).
3. Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Primera versión de La Barbería"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

(El archivo `.gitignore` ya está configurado para que tu `.env` con las claves secretas
**no** se suba a GitHub — eso es importante, no lo edites.)

## Paso 5 — Desplegar en Vercel (gratis)

1. Ve a [vercel.com](https://vercel.com) y entra con tu cuenta de GitHub.
2. **Add New → Project**, elige tu repositorio.
3. En **Environment Variables**, añade las tres del `.env`:

   * `VITE\\\\\\\_SUPABASE\\\\\\\_URL`
   * `VITE\\\\\\\_SUPABASE\\\\\\\_ANON\\\\\\\_KEY`
   * `VITE\\\\\\\_ADMIN\\\\\\\_PIN`
4. Pulsa **Deploy**. En un par de minutos tendrás una URL real, tipo `la-barberia.vercel.app`.

Cada vez que hagas `git push` con cambios, Vercel actualiza la web sola.

## Paso 6 — Dominio propio (opcional)

Compra algo como `labarberia.com` en Namecheap o similar, y en Vercel ve a
**Settings → Domains** para conectarlo. Vercel te dará instrucciones exactas.

## Paso 7 — Compártelo

* Ponlo como "sitio web" en tu perfil de Instagram (@labarberia.breda) y en Google Business Profile.
* Genera un código QR con la URL (hay generadores gratis online) y ponlo en el local.

\---

## Estructura del proyecto

```
la-barberia-web/
  public/
    logo.png          ← tu logo
  src/
    App.jsx            ← toda la lógica y el diseño de la app
    supabaseClient.js   ← conexión con la base de datos
    main.jsx
    index.css
  .env.example
  package.json
```

## Próximos pasos posibles

* Envío automático de email de confirmación (con [Resend](https://resend.com), sin backend propio).
* Login real para el panel del negocio (Supabase Auth) en vez del PIN simple.
* Recordatorio 24h antes por WhatsApp Business API.

