# ANEXO B: Manual de Despliegue e Instalación (DevOps)

Guía paso a paso para que un desarrollador nuevo clone el proyecto, instale dependencias, configure las variables de entorno y levante el **Sistema de Votación Electrónica** de Yavirac, tanto en modo local (desarrollo) como en producción.

---

## B.1. Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | 24+ | Requerido por `apps/api` y `apps/web` |
| PostgreSQL | 17+ | Motor de base de datos único del sistema |
| pnpm | 10.x | Gestor de paquetes del monorepo (`packageManager` fijado en `package.json`) |
| Git | cualquiera reciente | Para clonar el repositorio |
| Cuenta SMTP | — | Solo para envío real de credenciales (Google Workspace u otro proveedor SMTP) |

El proyecto es un **monorepo pnpm + Turborepo** con dos aplicaciones independientes: `apps/api` (NestJS 11 + Prisma) y `apps/web` (Angular 22).

---

## B.2. Clonar el repositorio

```bash
git clone <url-del-repositorio> votaciones
cd votaciones
```

## B.3. Instalar dependencias

Desde la raíz del monorepo (**no** dentro de `apps/api` o `apps/web`):

```bash
pnpm install
```

Este comando instala las dependencias de ambos workspaces y ejecuta automáticamente el `postinstall` de `apps/api` (`prisma generate`), que genera el cliente Prisma en `apps/api/prisma/generated`.

---

## B.4. Configurar variables de entorno (`.env`)

El backend valida sus variables de entorno con **Zod al arrancar**: si falta una obligatoria o tiene un valor inseguro, el proceso **no levanta**. Copie la plantilla y complétela:

```bash
cd apps/api
cp .env.example .env
```

| Variable | Obligatoria | Valor típico en local | Valor en producción |
|---|---|---|---|
| `NODE_ENV` | no (default `development`) | `development` | `production` |
| `PORT` | sí | `3000` | puerto interno del proceso Node |
| `DATABASE_URL` | sí | `postgresql://usuario:password@localhost:5432/votaciones` | cadena de conexión real de PostgreSQL |
| `JWT_SECRET` | condicional | cualquiera | **obligatorio**, ≥32 caracteres, distinto del valor por defecto (el arranque falla si no se cumple) |
| `JWT_EXPIRATION` | no (default `7d`) | `7d` | según política de sesión |
| `JWT_RESET_EXPIRATION` | no (default `15m`) | `15m` | igual |
| `MAIL_MODE` | condicional | `preview` (no envía correos reales; se ve un buzón de prueba en el panel de Jornada) | **obligatorio `smtp`** (el arranque falla si no) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | solo si `MAIL_MODE=smtp` | — | credenciales de una cuenta SMTP institucional (Google Workspace: usar **contraseña de aplicación**, no la clave personal) |
| `PUBLIC_APP_URL` | no (default `http://localhost:4200`) | `http://localhost:4200` | URL pública exacta del frontend (también fija el único origen permitido por CORS en producción) |

> ⚠️ **Importante:** el archivo `apps/api/.env.example` versionado en el repositorio actualmente contiene un `SMTP_PASS` con apariencia de contraseña de aplicación real, no un placeholder. Antes de continuar, revísenlo y, si es una credencial real, **rótenla de inmediato** (revocarla en Google Workspace) y reemplácenla en el `.env.example` por un valor de ejemplo genérico — ese archivo se sube a Git y no debe contener secretos reales.

Verifique la configuración SMTP sin arrancar todo el sistema con el script incluido:

```bash
pnpm -C apps/api test:smtp
```

El frontend no requiere `.env`: su configuración vive en `apps/web/src/environments/` y se selecciona por build (ver B.6).

---

## B.5. Preparar la base de datos

Con `DATABASE_URL` apuntando a una base PostgreSQL vacía:

```bash
# Desarrollo: crea/aplica migraciones y regenera el cliente
pnpm -C apps/api db:migrate

# Producción: solo aplica migraciones ya generadas, sin prompts
pnpm -C apps/api db:deploy

# Datos base (perfiles, opciones, usuario admin inicial, catálogos)
pnpm -C apps/api db:seed
```

Use `db:migrate` únicamente en desarrollo (genera archivos de migración nuevos). En producción use siempre `db:deploy`, que solo ejecuta migraciones ya versionadas en `apps/api/prisma/migrations`.

---

## B.6. Levantar en modo local (desarrollo)

Desde la raíz, con un solo comando (Turbo levanta ambas apps en watch mode):

```bash
pnpm dev
```

Esto expone:
- **API:** `http://localhost:3000/api/v1` (Swagger en `http://localhost:3000/api/docs`)
- **Web:** `http://localhost:4200` (usa `environment.development.ts`, que apunta directo a `http://localhost:3000/api/v1`)

También pueden levantarse por separado:

```bash
pnpm -C apps/api dev     # nest start --watch
pnpm -C apps/web dev     # ng serve
```

---

## B.7. Desplegar en producción

### B.7.1. Backend (`apps/api`)

```bash
cd apps/api
pnpm install --prod=false     # necesita devDependencies para compilar
pnpm build                    # nest build -> dist/
pnpm db:deploy                # aplica migraciones pendientes
pnpm start:prod                # node dist/main
```

Requisitos para que el arranque no falle: `NODE_ENV=production`, `JWT_SECRET` fuerte (≥32 caracteres), `MAIL_MODE=smtp` con credenciales SMTP válidas, y `PUBLIC_APP_URL` igual al dominio real del frontend. Ejecute el proceso bajo un supervisor (`pm2`, `systemd`, contenedor, etc.) para que se reinicie ante caídas; el proyecto no incluye un `Dockerfile` ni manifiesto de `systemd` propios, así que el operador debe definirlos según su infraestructura.

### B.7.2. Frontend (`apps/web`)

```bash
cd apps/web
pnpm build
```

Genera el sitio estático en `apps/web/dist/web/browser/` (config `production` por defecto en `angular.json`, con `outputHashing` y presupuestos de bundle). Sirva esa carpeta con cualquier servidor de archivos estáticos (nginx, Apache, un bucket + CDN, etc.), con **fallback de rutas a `index.html`** para que el enrutamiento de Angular funcione (ya incluido como `_redirects` para plataformas tipo Netlify; en nginx equivale a `try_files $uri $uri/ /index.html;`).

El build de producción llama a la API en una ruta **relativa** (`/api/v1`, ver `environment.ts`), por lo que el frontend espera que su mismo dominio reenvíe `/api/*` al backend. Ejemplo de bloque nginx:

```nginx
server {
    listen 443 ssl;
    server_name votaciones.yavirac.edu.ec;

    root /var/www/votaciones/browser;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Con este esquema (mismo dominio para frontend y API vía proxy), las peticiones son de mismo origen y el `CORS` del backend prácticamente no entra en juego; aun así, `PUBLIC_APP_URL` debe coincidir exactamente con `https://votaciones.yavirac.edu.ec` porque también se usa como enlace en los correos de credenciales.

---

## B.8. Checklist post-despliegue

- [ ] `GET https://<dominio>/api/v1` responde (o `/api/docs` para ver Swagger, si está expuesto)
- [ ] Login de un usuario administrativo funciona y devuelve JWT
- [ ] `pnpm -C apps/api test:smtp` confirma que el correo real sale (con `MAIL_MODE=smtp`)
- [ ] El frontend en el dominio público carga y sus llamadas a `/api/v1/...` no fallan por CORS
- [ ] Las migraciones de Prisma están al día (`prisma migrate status` desde `apps/api`)
- [ ] El proceso de la API corre bajo un supervisor que lo reinicia ante caídas
- [ ] `.env` real **no** está commiteado (verificar `git status` en `apps/api`)

## B.9. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El backend no arranca, error de Zod en consola | Falta una variable obligatoria o `JWT_SECRET`/`MAIL_MODE` inválidos para `NODE_ENV=production` | Revisar el mensaje de Zod; completar `.env` según la tabla de B.4 |
| Frontend carga pero todas las llamadas a la API fallan | `PUBLIC_APP_URL` no coincide con el dominio real, o falta el proxy `/api` | Igualar `PUBLIC_APP_URL` al dominio exacto del frontend; verificar la regla de proxy en el servidor web |
| Los electores no reciben su credencial por correo | `MAIL_MODE=preview` en un ambiente que debía ser productivo | Confirmar `NODE_ENV=production` y `MAIL_MODE=smtp`; probar con `pnpm -C apps/api test:smtp` |
| Rutas de Angular dan 404 al refrescar el navegador | Falta el fallback SPA en el servidor estático | Configurar `try_files ... /index.html` (o el equivalente del hosting usado) |
| `prisma migrate deploy` falla en producción | Migraciones locales no confirmadas o base de datos desincronizada | No usar `db:migrate` en producción; regenerar el historial de migraciones en desarrollo y volver a desplegar |

---

*Fuentes: `apps/api/.env.example`, `apps/api/src/config/enviroment.ts`, `apps/api/src/main.ts`, `apps/api/package.json`, `apps/web/src/environments/`, `apps/web/angular.json`, `package.json`, `README.md`, `docs/arquitectura-tecnica.md`.*
