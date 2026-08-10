# Manual del administrador — Sistema de Votación Electrónica Yavirac

**Versión del documento:** 1.0 · **Fecha:** 2026-08-08
Guía operativa pantalla por pantalla para ejecutar un proceso electoral completo. Para entender **por qué** cada paso exige lo que exige, ver [`manual-flujo-completo.md`](./manual-flujo-completo.md); para el detalle técnico, ver [`arquitectura-tecnica.md`](./arquitectura-tecnica.md).

> ⚠️ **Antes de empezar cualquier proceso real, revise la sección 0 (verificación de ambiente).** La mayoría de bloqueos el día de la votación se originan en configuración de correo o de fechas hecha (o no hecha) semanas antes.

---

## 0. Verificación de ambiente (una sola vez, antes del primer proceso)

Esto lo hace normalmente el equipo técnico, no el administrador funcional, pero **debe confirmarse antes de anunciar cualquier elección**:

- [ ] `NODE_ENV=production` en el servidor de la API.
- [ ] `MAIL_MODE=smtp` (en producción es obligatorio; si falta, el sistema **no arranca**).
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (contraseña de aplicación de Google Workspace, no la clave personal), `SMTP_FROM` configurados y probados.
- [ ] `PUBLIC_APP_URL` coincide **exactamente** con el dominio real donde se sirve el sitio (si no coincide, el navegador rechazará las peticiones por CORS y **nada funcionará**, ni el panel ni el voto público).
- [ ] `JWT_SECRET` es un valor propio, largo (≥32 caracteres), no el de la plantilla.
- [ ] Hay al menos un usuario `ADMIN` activo para poder ingresar al panel.

Si algo de esto falla, ningún paso de las siguientes secciones va a completarse — es la causa raíz más común de "no me deja avanzar".

---

## 1. Ingreso al panel administrativo

1. Ir a `/admin/auth/login`.
2. Ingresar usuario y contraseña.
3. **Si el sistema exige cambio de contraseña** (primer ingreso o contraseña caducada), será redirigido automáticamente a restablecerla — no es un error, es esperado la primera vez que se usa una cuenta.
4. Tras ingresar, cae por defecto en **Jornada Electoral** (`elecciones/jornada`), que es la pantalla central del sistema.

**Nota:** la sesión se guarda solo mientras la pestaña/navegador esté abierto (no sobrevive a cerrar el navegador). Si trabaja en un turno largo, tenga esto presente para no perder contexto a mitad de una tarea.

**Gestión de accesos:** si usted no ve todas las opciones de este manual en su menú, es porque su cuenta tiene un **Perfil** con acceso restringido a ciertas pantallas (`Seguridad > Perfiles`). Un usuario `ADMIN` sin perfil asignado ve todo; con perfil asignado, solo ve lo que ese perfil tiene habilitado en `Seguridad > Opciones`. Si necesita acceso a una pantalla que no ve, contacte a quien administra perfiles.

---

## 2. Crear y configurar una nueva elección

**Pantalla:** `Elecciones` → botón crear.

1. Complete nombre, tipo de elección y fecha de convocatoria.
   - ⚠️ La fecha de convocatoria **no puede ser una fecha ya pasada**.
2. Guarde. La elección queda en estado **Borrador**.

### 2.1 Configuración visual (`Elecciones > Configuración`)

Nombre institucional, logo, escudo, colores (hay un botón de acceso rápido "aplicar paleta Yavirac"), mensaje de bienvenida. Esto se ve reflejado en el sitio público y en los correos de credenciales — configúrelo antes de enviar cualquier credencial si quiere que el correo se vea institucional.

### 2.2 Cronograma (`Elecciones > Cronograma`)

Complete las 14 fechas del proceso. **Esta es la pantalla que más frecuentemente bloquea procesos completos si se llena mal o tarde.** Reglas que el sistema exige (rechaza guardar si no se cumplen):

| Campo | Regla |
|---|---|
| Todas las fechas | No pueden quedar en el pasado al momento de guardarlas |
| Inicio/fin de inscripción, impugnación de candidaturas, campaña, votación | El "fin" debe ser posterior al "inicio" |
| Publicación de resultados | Debe ser posterior al cierre de votación |
| Publicación del padrón | Debe ser **al menos 10 días antes** del inicio de votación |
| Fin de campaña | Debe ser **al menos 24 horas antes** del inicio de votación |
| Convocatoria vs. inicio de votación | Debe haber **al menos 20 días** de diferencia (Art. 9) |

**Recomendación práctica:** calcule el cronograma completo hacia atrás desde la fecha deseada de votación, respetando estos márgenes mínimos, y cárguelo todo de una vez. Modificarlo a medias genera reintentos de guardado fallidos.

### 2.3 Dignidades (`Elecciones > Dignidades`)

Cree cada cargo en disputa: nombre, tipo de elector permitido (Docente/Estudiante/Ambos), cantidad de ganadores, si requiere lista electoral, orden de aparición.

- [ ] **Debe existir al menos una dignidad activa** antes de poder abrir candidaturas o iniciar la jornada.

---

## 3. Padrón electoral

### 3.1 Catálogo de electores (`Elecciones > Electores`)

Aquí se administra el catálogo maestro (independiente de la elección puntual): cédula, nombres, **correo**, tipo, carrera/nivel/paralelo/jornada académica, foto opcional.

- [ ] **El correo debe ser institucional (`@yavirac.edu.ec` o subdominio).** Un correo personal o mal escrito no bloquea la carga del elector, pero **sí bloqueará el inicio de la votación** más adelante (paso 3 de la jornada) para toda la elección, no solo para esa persona. Revise esto con cuidado al importar/cargar electores masivamente.
- Puede activar/desactivar electores; un elector inactivo no participa en ningún padrón nuevo.

### 3.2 Padrón por elección (`Elecciones > Padrón`)

1. Asigne electores a esta elección: manualmente (seleccionando personas puntuales) o con **"Auto-generar"** (toma automáticamente a todos los electores activos cuyo tipo calce con las dignidades ya definidas — por eso conviene definir las dignidades *antes* de generar el padrón).
2. Revise el listado: puede cambiar el estado de cada fila a Habilitado / Inhabilitado / Observado, con motivo y observación. Un elector inhabilitado pierde su credencial de inmediato si ya la tenía.
3. **Publique el padrón** (botón "Publicar").
   - [ ] La elección debe estar en estado **Convocada** (o ya Padrón Publicado, para republicar cambios).
   - [ ] Debe existir al menos un elector en estado **Habilitado**.
   - Al publicar, la elección pasa a **Padrón Publicado** automáticamente.

> ⚠️ Publicar el padrón "bloquea" en la práctica esa lista de electores para esta elección: las credenciales solo pueden generarse sobre filas publicadas. Si necesita agregar electores después de publicar, puede hacerlo, pero recuerde volver a publicar / revisar que el nuevo elector quede en estado correcto.

---

## 4. Candidaturas

### 4.1 Abrir la inscripción (`Elecciones > Candidaturas` o `Listas`)

- [ ] La elección debe estar en **Padrón Publicado**.
- [ ] Debe haber al menos un elector Habilitado y publicado en el padrón.

Al abrir, la elección pasa a **Candidaturas Abiertas**.

### 4.2 Listas electorales (`Elecciones > Listas`), si aplica

Cree cada lista (código, nombre, color, propuesta). Si una dignidad no debe estar disponible para una lista específica, deshabilítela puntualmente desde el detalle de la lista.

### 4.3 Registrar candidaturas (`Elecciones > Candidaturas`)

Por cada postulante: elector + dignidad + (lista, si la dignidad la requiere). El sistema valida automáticamente que el elector esté habilitado en el padrón publicado, que su tipo calce con la dignidad, y que no tenga ya otra candidatura vigente en esta elección — si algo de esto falla, verá el motivo exacto en el mensaje de error.

### 4.4 Calificar candidaturas

Para cada candidatura, decida: **Calificar**, **Observar**, **Rechazar** o **Retirar** (se le pedirá una observación/justificación por diálogo).

- **Si Observa una candidatura**, el postulante tiene **24 horas** para subsanar (el sistema calcula el plazo automáticamente). Si no subsana a tiempo, **el sistema la rechaza automáticamente**, sin que usted tenga que hacer nada — pero tampoco hay aviso proactivo, así que revise candidaturas observadas con vencimiento próximo.
- **Subsanación:** el propio postulante (o el administrador en su nombre) puede subsanar dentro del plazo; la candidatura vuelve a Inscrita para que la vuelva a calificar.
- **Impugnación de calificación (candidaturas Rechazadas):** cualquier interesado puede impugnar una candidatura rechazada, indicando nombre, correo de notificación y fundamento. Usted resuelve la impugnación como **Aceptada** (la candidatura vuelve directo a Calificada) o **Rechazada** (es resolución final — no hay otra instancia en el sistema, así que resuelva con cuidado).

### 4.5 Paridad de género en listas

Antes de calificar una **lista** completa (no candidatura individual), el sistema exige:
- [ ] Todos los integrantes vigentes (no retirados) de la lista tienen género registrado.
- [ ] Ningún género supera el **60%** de la lista (si tiene 2 o más integrantes).

Si falta un dato de género o la lista está desbalanceada, el cambio de estado de la lista será rechazado con el detalle. Corrija los datos de los electores involucrados (`Elecciones > Electores`) antes de reintentar.

### 4.6 Cerrar la calificación

Botón "Cerrar calificación". **Bloquea si:**
- [ ] Quedan candidaturas en estado Inscrita u Observada sin resolver.
- [ ] Alguna dignidad activa se queda sin ninguna candidatura Calificada.

Resuelva todos los pendientes (calificar, o dejar que venza el plazo de subsanación) antes de reintentar. Al cerrar, la elección pasa a **Candidaturas Calificadas** — el tarjetón de votación queda definido a partir de aquí.

---

## 5. Jornada electoral — el día de la votación

**Pantalla única:** `Elecciones > Jornada`. Todo el control del día de votación pasa por aquí, en 5 pasos secuenciales que se ejecutan **en orden estricto**; no se puede saltar ninguno.

### Paso 1 — Inicializar Jornada

Botón "Inicializar". **Requiere:**
- [ ] Padrón publicado con al menos un elector Habilitado.
- [ ] Al menos una candidatura Calificada.

A partir de este paso, la configuración de la elección queda bloqueada para esta jornada (no se pueden editar dignidades/candidaturas mientras la jornada está en curso).

### Paso 2 — Puesta a Cero

Botón "Puesta a cero". **Requiere:**
- [ ] Haber completado el Paso 1.
- [ ] **Cero votos** registrados. Si el sistema detecta votos existentes (por ejemplo, restos de una jornada anterior no reiniciada), este paso **falla con un mensaje explícito** — no continúe hasta entender de dónde vienen esos votos; si son de una prueba, use "Reiniciar Jornada" (sección 5.6) antes de proseguir con el proceso real.

### Antes del Paso 3: generar y enviar credenciales

Esto normalmente se hace entre el Paso 2 y el Paso 3 (aunque puede adelantarse). Botón **"Generar y enviar credenciales"** en el panel de Jornada (o en Padrón, para reenvíos puntuales).

1. Confirme la acción en el diálogo (es una operación con efecto real: genera contraseñas nuevas y envía correos).
2. El sistema procesa a todos los electores del padrón publicado y habilitado que aún no tengan credencial activa y confirmada.
3. Al terminar, muestra un resumen: **enviadas**, **fallidas**, **sin correo**.
4. **Revise el resumen con atención:**
   - **Sin correo:** ese elector no tiene email cargado — corríjalo en `Elecciones > Electores` y vuelva a intentar el envío para ese registro.
   - **Fallidas:** puede ser un problema de SMTP (verifique sección 0) o un correo con formato inválido. El detalle del error queda guardado por elector; puede reintentar el envío individual desde el listado de padrón (acción "reenviar credencial" en cada fila).
5. Repita hasta que **enviadas = total de electores habilitados** y no queden pendientes.

> Si usa el ambiente de pruebas (modo `preview`), los correos no salen realmente: revíselos en el **buzón de pruebas** disponible en el panel (útil para simulacros, nunca para producción).

### Paso 3 — Iniciar Votación

Botón "Iniciar votación". Es el paso con más condiciones — revise este checklist completo antes de presionarlo:

- [ ] Se completó el Paso 2 (puesta a cero).
- [ ] Hay electores habilitados en el padrón publicado.
- [ ] **Cero** electores habilitados con correo institucional inválido.
- [ ] **Cero** credenciales pendientes de generar/enviar (ver paso anterior).
- [ ] El cronograma tiene fecha de inicio y fin de votación configuradas.
- [ ] La hora actual ya alcanzó la fecha de inicio de votación del cronograma (si es antes, el sistema le dirá exactamente desde cuándo podrá iniciar).
- [ ] La hora actual todavía no superó la fecha de fin de votación del cronograma.

Si todo se cumple, la votación queda **abierta al público** de inmediato: el link de votación se activa y los votantes ya pueden ingresar a `/votar` con sus credenciales.

**Durante la votación abierta**, el panel muestra una cuenta regresiva hasta la fecha de cierre configurada, y permite ver el resumen de participación en tiempo real.

### 5.1 Si el link de votación se desactiva antes de tiempo

Use **"Reactivar link"**. Solo funciona si la votación ya se inició, aún no se cerró formalmente, y el cronograma de votación no ha vencido.

### Paso 4 — Cierre de Votación

Botón "Cerrar votación". **Requiere que la hora actual ya haya superado la fecha de fin de votación del cronograma** — el sistema no permite cerrar manualmente antes de esa hora desde este flujo. Si necesita cortar la votación antes de tiempo por una emergencia, la única vía es desactivar el link de votación (contacte soporte técnico) o, en último caso, reiniciar la jornada completa (ver 5.2, es destructivo).

Al cerrar, el acceso de cualquier votante se corta de inmediato (en su siguiente clic, aunque tenga su sesión abierta).

### Paso 5 — Resultados Electorales

Botón "Generar resultados". **Requiere:**
- [ ] Votación cerrada (Paso 4 completo).
- [ ] El cronograma tiene fecha de publicación de resultados.
- [ ] La hora actual ya alcanzó esa fecha.

Al completarse, los resultados quedan disponibles públicamente en `/resultados` del sitio web y en el panel `Elecciones > Resultados`.

### 5.2 Reiniciar Jornada (operación destructiva — usar con extremo cuidado)

Botón "Reiniciar", disponible en el panel de Jornada. **Borra permanentemente todos los votos emitidos y conteos de esta elección**, y regresa la jornada al Paso 1. Exige escribir un motivo justificativo, que queda guardado en el historial y en auditoría de forma permanente.

- **Úselo solo** ante un error grave detectado *antes* de considerar válidos los resultados (ej. una jornada de prueba que se ejecutó por error contra la elección real, o un problema técnico detectado a tiempo).
- **No lo use** para "corregir" resultados ya publicados — para eso existe el proceso formal de impugnación de resultados, que preserva el historial en vez de borrarlo.
- Después de reiniciar, deberá completar de nuevo los pasos 1 a 5 desde cero, incluyendo revisar que las credenciales sigan siendo válidas (puede que deba reenviarlas si fueron revocadas).

---

## 6. Resultados y cierre del proceso

`Elecciones > Resultados`: totales por dignidad, participación general, participación por carrera (las carreras con menos de 5 votantes no muestran su desglose individual, solo el agregado, para proteger el anonimato en grupos pequeños), exportación a CSV, descarga de actas en PDF, impresión directa.

Los estados posteriores del ciclo de vida normativo (impugnación de resultados, resultados definitivos, posesión, o anulación de la elección completa) se gestionan según el proceso institucional vigente en el Consejo Electoral; consulte al equipo técnico si necesita habilitar esas pantallas específicas (ver nota de arquitectura sobre "consolidación en Jornada" en `arquitectura-tecnica.md` §4.5 — ese módulo existe en el backend pero sus pantallas dedicadas no están enrutadas en la interfaz actual).

---

## 7. Gestión de usuarios y seguridad del panel

### 7.1 Usuarios (`Seguridad > Usuarios`)

Cree cuentas de staff (usuario, nombre, correo, rol `ADMIN`/`USER`, perfil de acceso opcional). Puede resetear la contraseña de cualquier usuario (quedará obligado a cambiarla en su próximo ingreso) y activar/desactivar cuentas.

### 7.2 Perfiles y Opciones (`Seguridad > Perfiles` / `Seguridad > Opciones`)

- **Opciones** es el catálogo de pantallas del sistema (jerárquico).
- **Perfiles** son grupos de acceso: a cada perfil se le asignan las Opciones (pantallas) que puede ver. Un usuario `ADMIN` **sin perfil asignado** ve todo el sistema sin restricción; si se le asigna un perfil, queda limitado a esas pantallas — úselo para crear roles como "solo consulta de resultados" o "solo gestión de padrón" sin dar acceso total.

### 7.3 Auditoría (`Seguridad > Auditoría`)

Registro de solo lectura de toda acción relevante del sistema: creaciones, ediciones, cambios de estado, logins/logouts, cambios de contraseña. Filtrable por tabla, operación, usuario y rango de fechas, con detalle expandible. Úselo para investigar cualquier discrepancia ("¿quién cambió esto y cuándo?").

---

## 8. Checklist consolidado — puntos que pueden bloquear el avance

Use esta lista como verificación rápida antes de cada hito importante:

**Antes de anunciar la elección:**
- [ ] Ambiente de correo en modo `smtp` y probado (sección 0).
- [ ] Cronograma completo y coherente con los márgenes mínimos (10 días padrón, 24h campaña, 20 días convocatoria).
- [ ] Al menos una dignidad activa definida.

**Antes de publicar el padrón:**
- [ ] Todos los electores relevantes tienen correo `@yavirac.edu.ec` válido cargado.
- [ ] Al menos un elector queda en estado Habilitado.

**Antes de cerrar candidaturas:**
- [ ] No quedan candidaturas Inscritas u Observadas sin resolver.
- [ ] Cada dignidad activa tiene al menos una candidatura Calificada.
- [ ] Las listas con más de un integrante cumplen paridad de género.

**Antes de iniciar la votación (Paso 3 de Jornada):**
- [ ] Puesta a cero completada con 0 votos.
- [ ] 0 electores habilitados con correo inválido.
- [ ] 0 credenciales pendientes (todas generadas y enviadas con éxito).
- [ ] La hora actual está dentro de la ventana de votación del cronograma.

**Antes de cerrar la votación:**
- [ ] La hora actual ya superó la fecha de cierre del cronograma.

**Antes de generar resultados:**
- [ ] Votación cerrada.
- [ ] La hora actual ya alcanzó la fecha de publicación de resultados del cronograma.

Si un paso se niega a avanzar, el mensaje de error del sistema siempre indica la condición exacta que falta — léalo con atención antes de contactar soporte técnico, en la mayoría de los casos indica directamente qué corregir y dónde.
