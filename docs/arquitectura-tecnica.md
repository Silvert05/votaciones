# Análisis técnico del sistema — Sistema de Votación Electrónica Yavirac

**Versión del documento:** 1.0 · **Fecha:** 2026-08-08
**Alcance:** este documento describe, a nivel técnico, cómo está construido el sistema (metodología, stack, arquitectura, estructura de carpetas, modelo de datos, seguridad y aspectos operativos). Complementa a:

- [`manual-flujo-completo.md`](./manual-flujo-completo.md) — flujo de negocio de punta a punta.
- [`manual-administrador.md`](./manual-administrador.md) — manual operativo paso a paso para el administrador.

---

## 1. Resumen ejecutivo

El sistema es una plataforma de **Voto Electrónico No Presencial (VENP)** para la institución Yavirac. Permite administrar procesos electorales completos —convocatoria, padrón electoral, inscripción y calificación de candidaturas, jornada de votación, escrutinio y publicación de resultados— y ofrece un sitio público donde el votante se autentica con cédula/contraseña y emite su voto de forma remota.

Es un **monorepo pnpm + Turborepo** con dos aplicaciones:

| App | Tecnología | Rol |
|---|---|---|
| `apps/api` | NestJS 11 + Prisma 7 + PostgreSQL | API REST, lógica de negocio, seguridad, correo, auditoría |
| `apps/web` | Angular 22 + Angular Material + Tailwind | Back-office administrativo (`/admin`) y sitio público de votación (`/`) |

Todo el código, mensajes de error, DTOs y comentarios están en **español**, siguiendo la convención del proyecto.

---

## 2. Metodología y enfoque de desarrollo

- **Arquitectura por dominios (module-per-domain):** tanto en el backend (`src/modules/*`) como en el frontend (`features/admin/*`, `features/website/*`) el código se organiza por dominio funcional (elecciones, candidaturas, padrones, jornada, votación, seguridad, auditoría, etc.), no por capa técnica. Cada módulo es autocontenible.
- **Diseño dirigido por máquinas de estado explícitas:** el ciclo de vida de una elección (`EstadoEleccion`) y el de la jornada electoral (`PasoJornada`) están modelados como enumeraciones con transiciones controladas y auditadas, no como banderas sueltas. Esto es la columna vertebral de todo el sistema.
- **Trazabilidad por diseño:** cada operación sensible (cambios de estado, altas/bajas, envíos de credenciales, login/logout) se registra en dos lugares: una tabla de auditoría genérica (`Auditoria`) y, para el ciclo de vida de la elección, un historial dedicado (`HistorialEstadoEleccion`, `JornadaEvento`).
- **Reglas de negocio codificadas explícitamente como validaciones de dominio**, citando el artículo normativo que las origina (ej. Art. 9, 12, 13, 14 — ver sección 6). No son reglas "mágicas": están documentadas en el propio código (`elecciones.service.ts`, `candidaturas.service.ts`).
- **Seguridad en capas (defense in depth):** autenticación JWT + autorización gruesa por rol (`Rol: ADMIN|USER`) + autorización fina por pantalla (`Perfil`/`Opcion`) + un guard completamente independiente para el flujo de voto (`VotoGuard`) que revalida el estado electoral en **cada** petición, no solo al login.
- **Monorepo con Turborepo** para orquestar build/lint/dev de ambas apps con cache de tareas; `pnpm` como gestor de paquetes (workspaces).
- **Tipado extremo a extremo:** TypeScript en ambas apps, DTOs con `class-validator`/`class-transformer` en el backend validados globalmente (`ValidationPipe` con `whitelist` + `forbidNonWhitelisted` + `transform`), Prisma genera tipos a partir del schema.
- **Testing:** Jest para unit/e2e en el backend (`pnpm -C apps/api test`, `test:e2e`); Vitest (vía `@angular/build:unit-test`) en el frontend.

No hay evidencia de un framework de gestión ágil formal (tickets, sprints) documentado en el repositorio; la organización del trabajo se refleja en el historial de commits y en la propia arquitectura modular.

---

## 3. Stack tecnológico completo

### 3.1 Backend — `apps/api`

| Categoría | Tecnología | Versión |
|---|---|---|
| Framework | NestJS | 11.1.x (`@nestjs/common`, `core`, `platform-express`) |
| ORM | Prisma | 7.8.x, con `@prisma/adapter-pg` (driver adapter nativo `pg`, no el engine binario clásico) |
| Base de datos | PostgreSQL | 17+ |
| Autenticación | Passport + `@nestjs/jwt` | JWT strategy (`passport-jwt`), estrategia adicional `jwt-reset` |
| Hashing de contraseñas/credenciales | `bcrypt` | 6.x (factor de coste 12) |
| Validación | `class-validator` + `class-transformer` | 0.15.x / 0.5.x |
| Documentación de API | `@nestjs/swagger` | 11.x |
| Rate limiting | `@nestjs/throttler` | 6.x, guard global personalizado (`AccountAwareThrottlerGuard`) + `@Throttle` puntual en login de votante |
| Correo | `nodemailer` | 7.x, transporte SMTP o `jsonTransport` (modo preview) |
| Reportes/PDF | `pdfmake` | 0.3.x |
| Config/validación de entorno | `zod` | 4.x, validado en `src/config/enviroment.ts` |
| Testing | `jest` + `ts-jest` + `supertest` | 30.x |
| Lint/format | `eslint` 9 (flat config) + `prettier` 3 | |

### 3.2 Frontend — `apps/web`

| Categoría | Tecnología | Versión |
|---|---|---|
| Framework | Angular | 22.x (standalone components, `@angular/build:application` — nuevo builder basado en esbuild/Vite) |
| UI Kit | Angular Material + CDK | 22.x |
| Estilos | Tailwind CSS | 3.4.x (compilado en build), sobre la base del template **Fuse** (`src/@core/`) |
| Gráficos | ApexCharts (`ng-apexcharts`) | participación y resultados |
| Notificaciones/diálogos | SweetAlert2 | toasts y confirmaciones (`NotifyService`) |
| Fechas | Luxon + `@angular/material-luxon-adapter` | datepickers |
| i18n | `@jsverse/transloco` (dependencia presente, sin evidencia de uso activo en las páginas revisadas) | |
| Testing | Vitest (vía `@angular/build:unit-test`) | |

### 3.3 Herramientas de monorepo

- **pnpm** (10.x, `packageManager` fijado en `package.json`) — gestor de paquetes con workspaces.
- **Turborepo** (2.x) — orquestación de `dev`/`build`/`lint` con cache incremental entre `apps/api` y `apps/web`.

### 3.4 Requisitos de plataforma

- Node.js 24+
- PostgreSQL 17+
- Windows: `apps/api` incluye `scripts/nest-windows-watch-fix.cjs`, un workaround para un bug conocido de `chokidar` en modo watch sobre Windows.

---

## 4. Arquitectura del backend (`apps/api/src`)

### 4.1 Bootstrap y configuración global (`main.ts`)

- Prefijo global de rutas: **`/api`**.
- Versionado por URI: **`/v1`** (`VersioningType.URI`, `defaultVersion: '1'`) → toda ruta real queda bajo `/api/v1/...`.
- `ValidationPipe` global: `whitelist: true` (descarta propiedades no declaradas en el DTO), `forbidNonWhitelisted: true` (**rechaza** la petición si trae propiedades extra, no las ignora silenciosamente), `transform: true` (castea tipos automáticamente, ej. query params a número/booleano).
- `HttpExceptionFilter` global — formatea todas las excepciones HTTP de forma consistente.
- CORS: en producción el único origen permitido es `envs.PUBLIC_APP_URL` (debe coincidir **exactamente** con el dominio del frontend); en desarrollo también se permite `http://localhost:4200`. `credentials: true`.
- Swagger montado vía `src/docs/`.
- `ThrottlerModule` global (300 peticiones/60s por defecto) con un guard personalizado `AccountAwareThrottlerGuard` aplicado como `APP_GUARD`; el login del votante además tiene un límite específico más estricto (`@Throttle({ default: { limit: 5, ttl: 60_000 } })`, 5 intentos/minuto) para mitigar fuerza bruta sobre credenciales de votación.

### 4.2 Convención de imports

No se usan alias `@app/*`. Los imports no relativos (`src/config`, `src/prisma`, `prisma/generated/enums`) resuelven contra `baseUrl: "./"` en `apps/api/tsconfig.json`, es decir, relativo a `apps/api/`. El cliente Prisma se genera en `apps/api/prisma/generated` (no en `node_modules`), por lo que siempre se importa como `prisma/generated/client` / `prisma/generated/enums`, nunca `@prisma/client`.

### 4.3 Inventario de módulos (`src/modules/*`)

Cada módulo sigue el patrón `xxx.module.ts` / `xxx.controller.ts` / `xxx.service.ts` / `dto/*.dto.ts`.

| Módulo | Responsabilidad | Notas clave |
|---|---|---|
| `auth/` | Login de staff, reseteo forzado de contraseña, cambio de contraseña, perfil propio | JWT `type: 'access'` (7d por defecto) y `type: 'reset'` (15m); `JwtAuthGuard`, `RolesGuard` + `@Roles(Rol.ADMIN)`, guard separado `JwtResetGuard` para el flujo de reseteo |
| `seguridad/` | `Perfil` (grupo de acceso) ↔ `Opcion` (pantalla, jerárquica vía `padreId`) vía `PerfilOpcion` | Construye el menú y las `rutasPermitidas`/`codigosPermitidos` que el login devuelve al frontend |
| `elecciones/` | CRUD de `Eleccion`, máquina de estados (`cambiarEstado` con tabla `allowedTransitions`), `ConfiguracionEleccion` (branding), `CronogramaElectoral`, `Dignidad`, dashboard agregado | Contiene las validaciones normativas de fechas (Art. 9, ver §6) |
| `candidaturas/` | Apertura/cierre de inscripción, `ListaElectoral`, `Candidatura`, calificación, subsanación (Art. 13), impugnación de calificación (Art. 14), paridad de género (Art. 12) | Único módulo con reglas normativas de plazo automático (`expirarSubsanacionesVencidas`) |
| `padrones/` | Catálogo maestro de `Elector` (con foto), `PadronElectoral` por elección, asignación/auto-generación, publicación, generación y envío de credenciales | Genera la contraseña de 12 caracteres, la hashea con bcrypt y delega el envío a `correo/` |
| `jornada/` | Orquesta el día de votación como 5 pasos secuenciales (`PasoJornada`), cada uno con precondiciones estrictas | Ver detalle completo en §5 y en el manual de flujo |
| `votacion/` | Servicio compartido de tarjetón/emisión de voto (usado tanto por el panel admin legado como por `publico/`), `VotoGuard` | El controlador admin (`votacion.controller.ts`) expone apertura/cierre manual y resultados; en la UI actual estas pantallas están deshabilitadas a favor de `jornada/` (ver §4.5) |
| `publico/` | Único punto de entrada para el sitio público: landing, resultados, participación, candidatos, login y voto del votante | Sin `JwtAuthGuard`; usa `VotoGuard` solo en las dos rutas de votante autenticado |
| `escrutinio/` | Actas de escrutinio, impugnación de resultados, segunda vuelta | Módulo completo y funcional en el backend, pero **sin pantallas enrutadas** en el frontend actual (ver §4.5) |
| `auditoria/` | Registro genérico de auditoría (`Auditoria`), constantes de tabla/operación | `registrar()` nunca lanza excepción — ver §7.1 |
| `users/` | CRUD de usuarios de staff (`Usuario`), reseteo de contraseña administrativo | |
| `correo/` | Envío de credenciales de votación vía SMTP o `preview` (buzón simulado) | Ver §6.4 |
| `reportes/` | Generación de PDFs de actas/participación por dignidad (`pdfmake`) | Blob responses consumidos por la pantalla de Resultados |

### 4.4 Modelo de guards y decoradores de autenticación

- `JwtAuthGuard` — valida JWT de staff (`type: 'access'`), usado implícitamente en la mayoría de controladores admin.
- `RolesGuard` + `@Roles(Rol.ADMIN)` — control grueso por rol (`Rol` solo tiene `ADMIN`/`USER`).
- `JwtResetGuard` — valida únicamente el token corto de reseteo de contraseña (`type: 'reset'`), independiente del guard normal, para que un usuario que debe cambiar su contraseña no pueda usar ese token para nada más.
- `VotoGuard` (`modules/votacion/guards/voto.guard.ts`) — **completamente independiente** de `JwtAuthGuard`. No solo verifica la firma del JWT: en cada petición vuelve a consultar la base de datos y exige simultáneamente que:
  - el padrón esté `publicado`, `estado = HABILITADO`, el elector `activo`;
  - exista `credencialHash` y no haya `credencialRevocadaAt`;
  - `credencialVersion` del padrón coincida exactamente con la del token (invalida tokens viejos si se regenera la credencial);
  - el elector no tenga ya un `VotoEmitido` para esa elección;
  - la elección esté en estado `VOTACION_ABIERTA` **y** `jornada.linkVotacionActivo` sea `true`.

  Si cualquiera de estas condiciones falla, la sesión de voto se corta inmediatamente con 401, aunque el JWT en sí siga siendo válido criptográficamente. Esto es lo que permite al administrador "cortar" la votación en caliente desde el panel de Jornada sin depender de que expiren los tokens.
- `@CurrentUser()` / `AuthUser` — expone el usuario de staff autenticado (incluye `perfil`, `menu`, `rutasPermitidas`, `codigosPermitidos`).
- `@Votante()` — expone el payload del votante (`sub` = electorId, `eleccionId`, `identificacion`, `credencialVersion`) inyectado por `VotoGuard` en `request.votante`.

### 4.5 Nota de arquitectura importante: consolidación en "Jornada"

El backend conserva módulos completos y funcionales para **escrutinio** (actas, impugnaciones de resultados, segunda vuelta) y para **apertura/cierre manual de votación** (`votacion.controller.ts`, endpoints `abrir`/`cerrar`/`resultados`). Sin embargo, el frontend actual **no enruta** esas pantallas (`features/admin/escrutinio/*`, `features/admin/votacion/pages/votacion`): quedaron reemplazadas por un único panel, **Jornada Electoral** (`elecciones/jornada`), que orquesta todo el día electoral de punta a punta. `AuthService.HIDDEN_ADMIN_ROUTES` en el frontend oculta explícitamente esas rutas incluso para usuarios `ADMIN` sin restricciones.

**Implicación operativa:** todo el control del día de votación se hace desde una sola pantalla. Los endpoints de escrutinio/votación manual siguen existiendo en la API (documentados en Swagger) pero no deben considerarse parte del flujo operativo vigente salvo que se reactiven sus rutas en el frontend.

---

## 5. Modelo de datos (`apps/api/prisma/schema.prisma`)

Generador: `prisma-client` (nuevo generador de Prisma 7) con `moduleFormat: cjs`, salida a `./generated`. Adaptador `@prisma/adapter-pg` sobre PostgreSQL. Todas las tablas/columnas usan `snake_case` en la base de datos vía `@map`/`@@map`; el código usa `camelCase`/`PascalCase`.

### 5.1 Enumeraciones clave

```
Rol                     ADMIN | USER
TipoOpcion              GRUPO | PANTALLA
TipoEleccion            INSTITUCIONAL | CONSEJO_ESTUDIANTIL | PRESIDENTES_CURSO | OTRO
EstadoEleccion          BORRADOR → CONVOCADA → PADRON_PUBLICADO → CANDIDATURAS_ABIERTAS →
                        CANDIDATURAS_CALIFICADAS → CAMPANIA → VOTACION_ABIERTA →
                        VOTACION_CERRADA → ESCRUTINIO → RESULTADOS_PROVISIONALES →
                        [IMPUGNACION_RESULTADOS] → RESULTADOS_DEFINITIVOS → POSESIONADA
                        (ANULADA es terminal y alcanzable desde casi cualquier estado)
TipoElector             DOCENTE | ESTUDIANTE | AMBOS
Genero                  MASCULINO | FEMENINO | OTRO
EstadoPadronElector     HABILITADO | INHABILITADO | OBSERVADO
EstadoListaElectoral    BORRADOR | INSCRITA | OBSERVADA | CALIFICADA | RECHAZADA | RETIRADA
EstadoCandidatura       INSCRITA | OBSERVADA | CALIFICADA | RECHAZADA | RETIRADA
TipoVoto                CANDIDATO | BLANCO | NULO
EstadoActaEscrutinio    BORRADOR | CERRADA | APROBADA
EstadoImpugnacionResultado  PENDIENTE | ACEPTADA | RECHAZADA
PasoJornada             INICIALIZACION → PUESTA_A_CERO → INICIO_VOTACION →
                        CIERRE_VOTACION → RESULTADOS
```

La tabla de transiciones permitidas de `EstadoEleccion` vive en código (`elecciones.service.ts::allowedTransitions`), no en la base de datos — es una máquina de estados aplicativa, no un `CHECK` de SQL.

### 5.2 Entidades principales y relaciones

- **Seguridad:** `Usuario` (N:1 `Perfil`) — `Perfil` N:M `Opcion` vía `PerfilOpcion` — `Opcion` es auto-referencial (`padreId`, jerarquía de menú).
- **Elección:** `Eleccion` 1:1 `ConfiguracionEleccion` (branding), 1:1 `JornadaElectoral`, 1:1 `CronogramaElectoral`, 1:N `Dignidad`, 1:N `HistorialEstadoEleccion`.
- **Padrón/electores:** `Elector` (catálogo maestro, con `Carrera`/`Nivel`/`Paralelo`/`Jornada` académica — **no confundir con `JornadaElectoral`**) 1:N `PadronElectoral` (una fila por elección; aquí viven `credencialHash`, `credencialVersion`, `estado`, `publicado`).
- **Candidaturas:** `Dignidad` 1:N `Candidatura`; `Candidatura` N:1 `Elector`, N:1 opcional `ListaElectoral`; `ListaElectoral` 1:N `ListaDignidadEstado` (habilita/inhabilita una dignidad para una lista puntual).
- **Votación:** `VotoEmitido` (un registro por elector+dignidad, **sin** guardar la opción elegida — es solo el comprobante de "este elector votó esta dignidad"); `ConteoVoto` (agregado por elección+dignidad+opción, con `@@unique` que garantiza upsert atómico); `ConteoVotoCarrera` (agregado adicional por carrera, **sin** vincular jamás a un elector individual — así se preserva el secreto del voto incluso a nivel estadístico).
- **Escrutinio:** `ActaEscrutinio` (única por elección+dignidad+vuelta) 1:N `DetalleActaEscrutinio`; `ImpugnacionResultado` (contra un acta/dignidad) e `ImpugnacionCandidatura` (Art. 14, contra una calificación) son entidades separadas.
- **Jornada electoral:** `JornadaElectoral` (1:1 con `Eleccion`, guarda los 5 timestamps del proceso + `linkVotacionActivo` + `configBloqueada`) 1:N `JornadaEvento` (bitácora de cada paso ejecutado).
- **Auditoría:** `Auditoria` es una tabla plana e independiente (no tiene FK a las demás), con `tabla`/`registroId`/`operacion`/`datosAnteriores`/`datosNuevos` (JSON) /`usuario`/`ip`.

### 5.3 Integridad y decisiones de diseño notables

- `PadronElectoral` tiene `@@unique([eleccionId, electorId])` — un elector solo puede tener **un** registro de padrón por elección.
- `VotoEmitido` tiene `@@unique([eleccionId, dignidadId, electorId])` — imposibilita el doble voto a nivel de base de datos, además de la validación aplicativa.
- `credencialVersion` en `PadronElectoral` es un contador que se incrementa cada vez que se regenera una credencial; el JWT de voto lleva ese número congelado en el momento del login, y `VotoGuard` lo compara contra el valor actual en cada petición — así, regenerar una credencial invalida instantáneamente cualquier sesión de voto ya abierta con la credencial anterior.
- El `onDelete` de las relaciones con `Elector` desde `PadronElectoral`/`Candidatura`/`VotoEmitido` es `Restrict` — un elector con historial electoral no puede borrarse físicamente, solo desactivarse (`activo: false`).

---

## 6. Reglas de negocio codificadas (normativa aplicada en código)

Estas reglas están implementadas como validaciones activas, no solo como documentación. Se citan porque son bloqueantes reales del proceso:

| Regla | Dónde vive | Efecto |
|---|---|---|
| **Art. 9** — la convocatoria debe hacerse con ≥20 días de anticipación al inicio de votación | `elecciones.service.ts::validateCronograma` | Rechaza el cronograma si `fechaInicioVotacion < fechaConvocatoria + 20 días` |
| El padrón debe publicarse ≥10 días antes del inicio de votación | `elecciones.service.ts::validateCronograma` | Rechaza si `fechaPublicacionPadron` cae después de ese límite |
| La campaña debe suspenderse ≥24h antes del inicio de votación | `elecciones.service.ts::validateCronograma` | Rechaza `fechaFinCampania` si viola el margen |
| **Art. 12** — paridad de género: ningún género puede superar el 60% de una lista con ≥2 integrantes vigentes, y todos deben tener género registrado | `candidaturas.service.ts::validarParidadGenero` | Bloquea que una lista pase a estado `CALIFICADA` si no cumple |
| **Art. 13** — una candidatura `OBSERVADA` tiene 24h para subsanar; vencido el plazo pasa automáticamente a `RECHAZADA` | `candidaturas.service.ts::subsanarCandidatura` / `expirarSubsanacionesVencidas` | El plazo (`plazoSubsanacionAt`) se evalúa de forma perezosa en cada listado/acción sobre candidaturas de esa elección |
| **Art. 14** — una candidatura `RECHAZADA` puede impugnar esa calificación; la resolución del Consejo Electoral es de última instancia | `candidaturas.service.ts::impugnarCalificacion` / `resolverImpugnacionCalificacion` | Si se `ACEPTA`, la candidatura vuelve a `CALIFICADA` directamente |
| El correo del elector debe terminar en `@yavirac.edu.ec` (o subdominio) para poder iniciar votación | `jornada.service.ts::obtenerResumenCredenciales` | Bloquea `iniciarVotacion` si hay electores habilitados con correo inválido |

---

## 7. Aspectos transversales

### 7.1 Auditoría (`AuditoriaService.registrar()`)

Escribe en la tabla `Auditoria` y **nunca lanza excepción** — un fallo de logging no debe tumbar la operación de negocio a la que está adjunto. Las constantes de `tabla` (`AuditTabla`) y `operacion` (`AuditOperacion`: `CREATE`, `UPDATE`, `ESTADO`, `RESET`, `LOGIN`, `LOGOUT`, `PASSWORD`, `DESCARGAR`) están centralizadas en `modules/auditoria/auditoria.constants.ts` y deben reutilizarse, no inlinearse.

### 7.2 Configuración de entorno (`src/config/enviroment.ts`)

Valida `process.env` con **Zod** al arrancar; si falla, el proceso **no levanta** (`throw new Error('Variables de entorno inválidas')`). Variables:

| Variable | Requerida | Notas |
|---|---|---|
| `NODE_ENV` | no (`development` por defecto) | `development`\|`test`\|`production` |
| `PORT` | **sí** | |
| `DATABASE_URL` | **sí** | cadena de conexión PostgreSQL |
| `JWT_SECRET` | no en dev (valor por defecto inseguro) / **sí en producción**, ≥32 caracteres y distinto del valor por defecto | el arranque falla en producción si no se cumple |
| `JWT_EXPIRATION` | no (`7d`) | vigencia del token de staff |
| `JWT_RESET_EXPIRATION` | no (`15m`) | vigencia del token de reseteo forzado |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | condicional | obligatorias en la práctica si `MAIL_MODE=smtp` |
| `PUBLIC_APP_URL` | no (`http://localhost:4200`) | URL del frontend; en producción también fija el único origen CORS permitido |
| `MAIL_MODE` | no (`preview`) | `preview`\|`smtp`; **en producción debe ser `smtp`**, el arranque falla si no |

### 7.3 Envío de credenciales / correo (`correo/correo.service.ts`)

- **Modo `preview`** (por defecto, uso local/desarrollo): usa el `jsonTransport` de Nodemailer (no envía correo real) y además guarda cada envío en un **buzón de pruebas en memoria** (máx. 500 entradas), expuesto vía `GET/DELETE /correo/buzon-pruebas` y visible desde el panel de Jornada.
- **Modo `smtp`** (producción, obligatorio): requiere `SMTP_HOST` + `SMTP_FROM` configurados; Yavirac usa Google Workspace, por lo que se recomienda una cuenta institucional con **contraseña de aplicación** (no la clave normal). Si falta configuración, `asegurarConfigurado()` lanza `ServiceUnavailableException` con un mensaje explícito.
- El correo de credencial incluye usuario (cédula), contraseña de un solo uso (12 caracteres alfanuméricos, generados con `crypto.randomInt`, sin caracteres ambiguos), y el link directo a `/votar?eleccion=<id>` construido sobre `PUBLIC_APP_URL`.
- Los envíos se procesan en lotes de 10 en paralelo; cada fallo individual se registra en `credencialEnvioError` sin abortar el resto del lote.

### 7.4 Rate limiting

- Global: 300 peticiones/60s por cliente (`AccountAwareThrottlerGuard`, `APP_GUARD`).
- Login de votante (`POST /publico/elecciones/:id/votante/login`): 5 intentos/60s — mitigación específica de fuerza bruta sobre credenciales de votación, que son más cortas y de un solo uso.

---

## 8. Arquitectura del frontend (`apps/web/src/app`)

### 8.1 Dos árboles de rutas independientes (`app.routes.ts`)

```
/            → features/website/routes.ts   (sitio público, layout 'website', SIN guards)
/admin/*     → features/admin/routes.ts     (back-office, layout 'admin', CON guards)
```

### 8.2 Back-office (`/admin`)

- `/admin/auth/*` (login, reset-password) — `layout: 'empty'`, protegido por `noAuthGuard` (bloquea a usuarios ya autenticados).
- `/admin/*` — `layout: 'admin'`, protegido en cascada por:
  1. `authGuard` (¿hay sesión?) a nivel de árbol.
  2. `roleGuard(['ADMIN'])` (rol grueso) por ruta.
  3. `optionGuard` (¿el `Perfil` del usuario tiene esta `Opcion` asignada?) por ruta — llama a `AuthService.canAccessRoute()`.

Pantallas activas: `perfil`, `seguridad/usuarios`, `seguridad/perfiles`, `seguridad/opciones`, `seguridad/auditoria`, `elecciones` (lista), `elecciones/configuracion`, `elecciones/cronograma`, `elecciones/dignidades`, `elecciones/electores`, `elecciones/padron`, `elecciones/listas`, `elecciones/candidaturas`, `elecciones/jornada` (home por defecto), `elecciones/resultados`.

**Pantallas con código presente pero no enrutadas** (ver §4.5): `dashboard`, `elecciones/votacion` (apertura/cierre manual), `elecciones/escrutinio`, `elecciones/impugnaciones`, `elecciones/resultados-finales`. `AuthService.HIDDEN_ADMIN_ROUTES` las oculta activamente del menú y de `canAccessRoute()`.

### 8.3 Autenticación en el frontend

- Almacenamiento: `sessionStorage` (no `localStorage`) — la sesión no sobrevive a un reinicio completo del navegador.
- `access_token` (staff) y `venp_voto_token` (votante) son **completamente independientes**: pueden coexistir en la misma pestaña sin conflicto.
- `authInterceptor` antepone `environment.api` a toda URL relativa, adjunta `Authorization: Bearer <token>` (salvo que la petición ya traiga su propio header — así funciona el flujo de reset con el token temporal), y en un `401` limpia la sesión y redirige a login.
- `AuthService.canAccessRoute(url)` reproduce en el cliente la misma lógica de `rutasPermitidas` que calculó el backend en el login — es una capa de UX (ocultar/redirigir), **no** el control de seguridad real, que vive en el backend (`RolesGuard`/`optionGuard`-equivalente del lado servidor mediante `codigosPermitidos`).

### 8.4 Sitio público (`/`)

Rutas: `inicio`, `actividades` (cronograma como timeline), `candidatos`, `votar`, `participacion` (polling cada 15s + gauge), `resultados` (gráficos + export CSV/PDF + impresión), `instructivo` (contenido estático). Todas consumen exclusivamente `publico/*` de la API. `PublicThemeService` aplica el branding (`ConfiguracionEleccion`) por elección en tiempo de ejecución.

**Flujo de "votar" (`pages/votar/votar.ts`)** — máquina de estados de UI (`seleccion → login → cedula → confirmar → listo`) descrita en detalle en el manual de flujo de proceso. El comprobante de voto (PNG) se genera **enteramente en el cliente** vía `<canvas>` — el backend solo devuelve datos estructurados (código, fecha, elector, elección), no una imagen.

### 8.5 Infraestructura compartida

- `src/@core/` — capa del template Fuse (navegación, layout, alertas, loading-bar, theming Tailwind). Se trata como infraestructura de UI, no como código de feature.
- `app/shared/services/notify.service.ts` — wrapper de SweetAlert2 para toasts.
- `app/shared/services/institutional-dialog.service.ts` — diálogo de confirmación/prompt usado en toda acción administrativa destructiva o que requiere justificación escrita (reinicio de jornada, cambios de estado, calificación/impugnación).

### 8.6 Build y entornos

- `environment.ts` (prod): `{ production: true, api: '/api/v1' }` — espera que la API esté proxeada bajo el mismo origen.
- `environment.development.ts`: `{ production: false, api: 'http://localhost:3000/api/v1' }`.
- `angular.json`: builder `@angular/build:application`; presupuestos de bundle en producción (3MB warning / 5MB error inicial); `outputHashing: all`.

---

## 9. Comandos de referencia

```bash
# Instalación y arranque (raíz del monorepo)
pnpm install
pnpm dev                 # ambas apps en watch (turbo)
pnpm build
pnpm lint

# API
pnpm -C apps/api dev
pnpm -C apps/api test
pnpm -C apps/api test:e2e
pnpm -C apps/api db:generate
pnpm -C apps/api db:migrate
pnpm -C apps/api db:seed

# Web
pnpm -C apps/web dev     # http://localhost:4200
pnpm -C apps/web build
pnpm -C apps/web test
```

Requisitos previos: Node 24+, PostgreSQL 17+, pnpm, y `apps/api/.env` con un `DATABASE_URL` real (ver `apps/api/.env.example`, que está deliberadamente excluido del `.gitignore` para servir de plantilla — nunca debe llevar secretos reales).

---

## 10. Puntos de atención técnica para quien opere o extienda el sistema

1. **La consolidación en "Jornada"** (§4.5) significa que cualquier cambio a escrutinio/votación manual debe evaluarse contra dos superficies: el backend (activo) y el frontend (con esas rutas deshabilitadas a propósito). No reactivar esas pantallas sin entender por qué se ocultaron.
2. **`MAIL_MODE` es el interruptor más crítico de producción.** Si el sistema arranca en `production` con `MAIL_MODE=preview`, la validación de Zod lo impide directamente — pero si alguien fuerza `NODE_ENV=development` en un servidor real "para que funcione", el correo de credenciales quedará en modo simulado y **ningún elector recibirá su clave real**. Verificar siempre `NODE_ENV=production` + `MAIL_MODE=smtp` + credenciales SMTP válidas antes de cualquier elección real.
3. **`JWT_SECRET` débil o por defecto bloquea el arranque en producción** — es una protección intencional, no un bug.
4. **`credencialVersion`** es el mecanismo que invalida sesiones de voto activas al regenerar una credencial; cualquier cambio a `padrones.service.ts` debe preservar ese incremento o se rompe la revocación de credenciales.
5. **El voto en sí (`VotoEmitido`) nunca almacena la opción elegida**, solo que "el elector X votó en la dignidad Y". La opción vive exclusivamente en los agregados (`ConteoVoto`/`ConteoVotoCarrera`), y el conteo por carrera nunca se cruza con el elector — esto es una decisión de diseño para el secreto del voto, no un detalle incidental; no debe "optimizarse" agregando esa relación.
