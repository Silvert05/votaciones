# Flujo completo del proceso electoral en producción

**Versión del documento:** 1.0 · **Fecha:** 2026-08-08
Este documento describe, paso a paso, **cómo se ejecuta un proceso electoral real de principio a fin** en el sistema, qué ocurre técnicamente en cada etapa, y qué condiciones deben cumplirse para poder avanzar a la siguiente. Es el mapa de negocio completo; para el detalle técnico de arquitectura ver [`arquitectura-tecnica.md`](./arquitectura-tecnica.md), y para instrucciones operativas paso a paso ver [`manual-administrador.md`](./manual-administrador.md).

---

## 1. Visión general: dos máquinas de estado que trabajan juntas

El sistema modela el proceso electoral con **dos máquinas de estado independientes pero sincronizadas**:

1. **`EstadoEleccion`** — el ciclo de vida "legal/administrativo" de la elección completa (14 estados, desde `BORRADOR` hasta `POSESIONADA`, con `ANULADA` como salida de emergencia).
2. **`PasoJornada`** — el ciclo de vida operativo del **día de votación** en sí (5 pasos: inicialización, puesta a cero, inicio, cierre, resultados), gestionado desde el panel único **"Jornada Electoral"**.

La jornada empuja a la elección a través de sus estados en los puntos críticos (`INICIO_VOTACION` fuerza `estado = VOTACION_ABIERTA`, etc.), pero antes de la jornada hay una fase de preparación (convocatoria, padrón, candidaturas) que se gestiona con pantallas separadas.

```
EstadoEleccion:
BORRADOR → CONVOCADA → PADRON_PUBLICADO → CANDIDATURAS_ABIERTAS → CANDIDATURAS_CALIFICADAS
   → CAMPANIA → VOTACION_ABIERTA → VOTACION_CERRADA → ESCRUTINIO → RESULTADOS_PROVISIONALES
   → [IMPUGNACION_RESULTADOS] → RESULTADOS_DEFINITIVOS → POSESIONADA
(ANULADA es alcanzable desde casi cualquier estado no terminal)

PasoJornada (el "día D"):
INICIALIZACION → PUESTA_A_CERO → INICIO_VOTACION → CIERRE_VOTACION → RESULTADOS
```

---

## 2. Fase 1 — Creación y configuración de la elección

### 2.1 Crear la elección

Un administrador crea una `Eleccion` (nombre, descripción, tipo — `INSTITUCIONAL`/`CONSEJO_ESTUDIANTIL`/`PRESIDENTES_CURSO`/`OTRO` —, fecha de convocatoria). Nace en estado **`BORRADOR`**, con una `JornadaElectoral` propia y vacía creada automáticamente (nunca se reutilizan votos ni eventos de un proceso anterior).

**Bloqueo posible:** la fecha de convocatoria no puede ser pasada.

### 2.2 Configurar branding (opcional pero recomendado)

Nombre institucional, logo, escudo, colores, mensaje de bienvenida (`ConfiguracionEleccion`). Se refleja en tiempo real en el sitio público y en los correos de credenciales.

### 2.3 Definir el cronograma

El `CronogramaElectoral` fija 14 fechas: convocatoria, publicación de padrón, inicio/fin de inscripción de candidaturas, inicio/fin de impugnación de candidaturas, publicación de candidaturas, inicio/fin de campaña, inicio/fin de votación, publicación de resultados, fin de impugnación de resultados, resultados finales.

**Este es el punto donde más bloqueos normativos se validan de una sola vez:**

| Validación | Regla |
|---|---|
| Ninguna fecha nueva/modificada puede ser pasada | comparación contra la hora del servidor |
| Inscripción: fin ≥ inicio | |
| Impugnación de candidaturas: fin ≥ inicio | |
| Campaña: fin ≥ inicio | |
| Votación: fin ≥ inicio | |
| Resultados se publican después del cierre de votación | `fechaPublicacionResultados ≥ fechaFinVotacion` |
| **Padrón publicado ≥10 días antes del inicio de votación** | Si no, la API rechaza el cronograma |
| **Campaña termina ≥24h antes del inicio de votación** | Si no, la API rechaza el cronograma |
| **Convocatoria ≥20 días antes del inicio de votación (Art. 9)** | Si no, la API rechaza el cronograma |

Si el cronograma no se guarda correctamente aquí, **la jornada no podrá iniciarse más adelante** (ver §5.3) — este es uno de los puntos donde más se debe planificar con anticipación real.

### 2.4 Definir las dignidades (cargos en disputa)

Cada `Dignidad` (ej. "Rector", "Representante Estudiantil Facultad X") define: tipo de elector permitido (`DOCENTE`/`ESTUDIANTE`/`AMBOS`), cantidad de ganadores, si requiere lista electoral, orden de aparición en el tarjetón.

**Bloqueo aguas abajo:** una elección sin dignidades activas no puede abrir candidaturas ni votación (`ensureCandidaturasCalificadas` y `emitirVoto` lo rechazan explícitamente).

---

## 3. Fase 2 — Padrón electoral

### 3.1 Catálogo maestro de electores

Independiente de cualquier elección: `Elector` (identificación, nombres, correo, tipo, carrera/nivel/paralelo/jornada académica, foto opcional ≤2MB JPG/PNG/WebP). Se administra una sola vez y se reutiliza entre procesos electorales.

**Importante para producción:** el **correo institucional debe terminar en `@yavirac.edu.ec`** (o subdominio) — es una condición dura para poder iniciar la votación más adelante (ver §5.3). Cargar electores con correos personales/erróneos genera trabajo de corrección tardío.

### 3.2 Asignar electores a la elección

Dos caminos, no excluyentes:
- **Manual:** seleccionar electores puntuales y asignarlos (`asignarElectores`).
- **Automático:** `autoGenerarPadron` toma todos los electores activos cuyo `tipo` calce con el `tipoElectorPermitido` de las dignidades activas de la elección.

Cada asignación crea un `PadronElectoral` en estado **`HABILITADO`** por defecto (único por elección+elector).

### 3.3 Depurar el padrón

Un elector puede pasar a `INHABILITADO` u `OBSERVADO` (con motivo/observación). Al des-habilitar, su credencial vigente se revoca inmediatamente (`credencialHash = null`, `credencialRevocadaAt`), lo que corta cualquier sesión de voto abierta con esa credencial en la siguiente petición (ver `VotoGuard`, arquitectura §4.4).

### 3.4 Publicar el padrón

`publicarPadron` marca `publicado = true` + `fechaPublicacion` en **todas** las filas de padrón de la elección y empuja `EstadoEleccion → PADRON_PUBLICADO`.

**Precondiciones:**
- La elección debe estar en `CONVOCADA` (o ya `PADRON_PUBLICADO`, para republicar).
- Debe existir al menos un elector en estado `HABILITADO`.

**Una vez publicado, el padrón queda ligado a esa elección de forma permanente** — las credenciales solo se generan sobre filas publicadas.

---

## 4. Fase 3 — Candidaturas

### 4.1 Abrir la inscripción

`abrirCandidaturas`: `EstadoEleccion` debe estar en `PADRON_PUBLICADO` y debe haber al menos un elector `HABILITADO` y publicado. Pasa a **`CANDIDATURAS_ABIERTAS`**.

### 4.2 Registrar listas electorales (si la dignidad lo requiere)

`ListaElectoral` (código, nombre, color, propuesta). Por cada `Dignidad`, una lista puede habilitarse/inhabilitarse explícitamente vía `ListaDignidadEstado` (por defecto habilitada).

### 4.3 Registrar candidaturas

Cada `Candidatura` liga un `Elector` a una `Dignidad` (y opcionalmente a una `ListaElectoral`). Validaciones al crear:

- La dignidad debe pertenecer a la elección y estar activa.
- El elector debe estar en el padrón **publicado y habilitado** de esa elección.
- El `tipo` del elector debe calzar con `tipoElectorPermitido` de la dignidad (salvo `AMBOS`).
- Si la dignidad `requiereLista`, la candidatura debe traer `listaId`.
- La lista no puede estar `RECHAZADA`/`RETIRADA`, ni tener esa dignidad inhabilitada para ella.
- Un mismo elector no puede tener dos candidaturas vigentes en la misma elección.

Nace en estado **`INSCRITA`**.

### 4.4 Calificación

El Consejo Electoral (vía el panel) califica cada candidatura a uno de: `CALIFICADA`, `OBSERVADA`, `RECHAZADA`, `RETIRADA` (nunca de vuelta a `INSCRITA` manualmente).

- **Si queda `OBSERVADA`**, se abre automáticamente un plazo de **24 horas** (`plazoSubsanacionAt`) para que el postulante subsane (Art. 13).
- **Subsanación:** dentro del plazo, la candidatura vuelve a `INSCRITA` para nueva revisión. El sistema revisa perezosamente (en cada listado/acción sobre candidaturas de esa elección) si el plazo venció; si venció sin subsanar, **pasa automáticamente a `RECHAZADA`** sin intervención manual.
- **Impugnación de calificación (Art. 14):** solo aplicable a candidaturas `RECHAZADA`. Cualquier interesado puede presentar una impugnación (nombre + correo de notificación + fundamento). El Consejo Electoral resuelve `ACEPTADA` (la candidatura vuelve directo a `CALIFICADA`) o `RECHAZADA` (resolución de última instancia, no hay otra apelación en el sistema).

### 4.5 Paridad de género (Art. 12)

Antes de que una `ListaElectoral` pueda pasar a `CALIFICADA`, si tiene ≥2 integrantes vigentes (no `RETIRADA`):
- Todos los integrantes deben tener género registrado.
- Ningún género puede superar el **60%** de los integrantes.

Si no se cumple, la API rechaza el cambio de estado de la lista con el detalle del artículo violado.

### 4.6 Cerrar la calificación

`cerrarCalificacion`: requiere `EstadoEleccion = CANDIDATURAS_ABIERTAS`. Antes de evaluar, expira automáticamente cualquier subsanación vencida. **Bloquea si:**
- Quedan candidaturas en `INSCRITA` u `OBSERVADA` (pendientes de resolver).
- Alguna dignidad activa no tiene **ninguna** candidatura `CALIFICADA`.

Si pasa, `EstadoEleccion → CANDIDATURAS_CALIFICADAS`. A partir de aquí el tarjetón de votación ya tiene forma definitiva (solo candidaturas `CALIFICADA` y no excluidas de segunda vuelta aparecen en el tarjetón).

### 4.7 Campaña

Estado intermedio `CAMPANIA` (transición manual desde `CANDIDATURAS_CALIFICADAS`) — periodo de difusión de propuestas antes de la votación, delimitado por `fechaInicioCampania`/`fechaFinCampania` del cronograma.

---

## 5. Fase 4 — Jornada electoral (el día de votación)

Toda esta fase se controla desde **un único panel** ("Jornada Electoral"), que ejecuta 5 pasos secuenciales, estrictamente uno después del otro. Cada paso queda registrado como `JornadaEvento` (con usuario y reporte/comentario) y, cuando corresponde, mueve `EstadoEleccion` y dispara `HistorialEstadoEleccion`.

### Paso 1 — Inicialización (`INICIALIZACION`)

**Precondiciones (bloquean si fallan):**
- Existe padrón **publicado** con al menos un elector `HABILITADO`.
- Existe al menos una `Candidatura` en estado `CALIFICADA`.

**Efecto:** marca `inicializadaAt` y **bloquea la configuración** (`configBloqueada = true`) — a partir de aquí, cambios estructurales a dignidades/candidaturas quedan congelados para esa jornada. Es idempotente: si ya estaba inicializada, no hace nada.

### Paso 2 — Puesta a cero (`PUESTA_A_CERO`)

**Precondiciones:**
- Debe haberse completado el Paso 1.
- **Cero votos** registrados en la elección (`VotoEmitido.count = 0`). Esto es una verificación de integridad tipo "urna vacía" — si por cualquier motivo ya existieran votos (ej. una jornada anterior no reiniciada correctamente), este paso **falla explícitamente** en vez de continuar en un estado inconsistente.

**Efecto:** marca `puestaCeroAt` con el reporte "Puesta a cero verificada: 0 votos."

### Paso 3 — Inicio de votación (`INICIO_VOTACION`)

Es el paso con más precondiciones — **léase con cuidado, es donde más procesos se traban el día D:**

1. Debe haberse completado el Paso 2.
2. Debe haber electores habilitados en el padrón publicado (`padronHabilitado > 0`).
3. **Cero electores con correo institucional inválido** (`correosInvalidos = 0`) — cualquier elector habilitado sin correo `@yavirac.edu.ec`/subdominio válido bloquea el arranque completo de la votación, no solo a ese elector.
4. **Cero credenciales pendientes** (`credencialesPendientes = 0`) — es decir, **todas** las credenciales deben estar generadas y enviadas exitosamente antes de poder iniciar. El mensaje de error indica exactamente cuántas faltan y remite a la acción "Generar y enviar credenciales".
5. El cronograma debe tener `fechaInicioVotacion` y `fechaFinVotacion` configuradas.
6. La hora actual debe ser `≥ fechaInicioVotacion` (si es antes, el sistema informa desde cuándo se habilitará automáticamente) y `< fechaFinVotacion` (si ya pasó, indica que el cronograma ya finalizó y no se puede iniciar así).

**Efecto:** si todo pasa, `EstadoEleccion → VOTACION_ABIERTA`, se marca `votacionIniciadaAt`, **`linkVotacionActivo = true`** (esta bandera es la que habilita en tiempo real el acceso del votante — ver §6) y se congela `fechaFinVotacion` en la jornada.

**Nota operativa clave:** el paso 3 depende enteramente de que el envío de credenciales (§3.4/§7) se haya completado con éxito para el 100% del padrón habilitado. Un solo correo rebotado o un elector sin email válido detiene todo el proceso, no solo a esa persona — hay que resolverlo (corregir el dato o inhabilitar a ese elector) antes de poder continuar.

### Paso 4 — Cierre de votación (`CIERRE_VOTACION`)

**Precondiciones:**
- La votación debe haberse iniciado.
- Si ya está cerrada, es idempotente (no repite el efecto).
- La hora actual debe ser `≥ fechaFinVotacion` del cronograma — **no se puede cerrar manualmente antes de tiempo** desde este flujo estándar (la única vía de corte anticipado real es desactivar el link, ver §5.5, o reiniciar la jornada completa, §5.6).

**Efecto:** `EstadoEleccion → VOTACION_CERRADA`, `votacionCerradaAt`, `linkVotacionActivo = false` (corta el acceso de cualquier votante inmediatamente, en su siguiente petición).

### Paso 5 — Resultados (`RESULTADOS`)

**Precondiciones:**
- La votación debe estar cerrada.
- El cronograma debe tener `fechaPublicacionResultados`.
- La hora actual debe ser `≥` esa fecha.

**Efecto:** `EstadoEleccion → RESULTADOS_PROVISIONALES`, `resultadosAt`. A partir de aquí los resultados son visibles en el sitio público (`/resultados`) y en el panel administrativo, con export CSV/PDF.

### 5.1 Reactivar el link de votación

Si por algún motivo el link quedó inactivo mientras la votación seguía formalmente abierta, `reactivarLink` lo vuelve a habilitar — pero solo si la votación ya inició, aún no se cerró, y el cronograma de votación no expiró.

### 5.2 Reiniciar la jornada (operación destructiva)

`reiniciar(motivo)` — **borra permanentemente** todos los `ConteoVoto` y `VotoEmitido` de la elección, borra el historial de `JornadaEvento`, y resetea los 5 timestamps de la jornada a `null` (vuelve al Paso 1). Si la elección estaba en `VOTACION_ABIERTA`/`VOTACION_CERRADA`/`RESULTADOS_PROVISIONALES`, la regresa a `CANDIDATURAS_CALIFICADAS`. Exige un motivo escrito, que queda registrado en `HistorialEstadoEleccion` y en auditoría.

**Esto es irreversible y debe usarse solo ante un error grave detectado antes de dar por válidos los resultados** — nunca como forma de "corregir" un resultado ya publicado (para eso existe el flujo de impugnación de resultados, en el módulo de escrutinio).

---

## 6. Fase 5 — El votante: flujo end-to-end

Todo pasa por `PublicoController` (`/api/v1/publico/...`), sin `JwtAuthGuard` (es la superficie pública) salvo en las dos rutas de votante autenticado, que usan `VotoGuard`.

### 6.1 El votante recibe su credencial

Cuando el administrador ejecuta "Generar y enviar credenciales" (ver §7), cada elector habilitado recibe un correo con: su usuario (cédula/identificación) y una **contraseña de un solo uso** de 12 caracteres, más un enlace directo a `/votar?eleccion=<id>`.

### 6.2 Selección de elección (si aplica)

En `/votar`, si hay un `?eleccion=` en la URL o solo hay una elección con votación disponible, se salta el selector.

### 6.3 Login del votante

`POST /publico/elecciones/:id/votante/login` (limitado a 5 intentos/minuto por IP). Verifica:
- La elección existe, está en `VOTACION_ABIERTA` y `linkVotacionActivo = true` (`ensureVotacionDisponible`).
- Existe un `PadronElectoral` publicado, `HABILITADO`, no revocado, para esa identificación, con el elector activo.
- La contraseña coincide con el hash bcrypt almacenado.
- El elector no haya votado ya en esa elección.

Si todo es correcto, se emite un **JWT de voto de 30 minutos** (`type: 'voto'`), distinto y separado del JWT de staff, con `credencialVersion` congelada en el momento del login.

### 6.4 Presentación del tarjetón

`GET /publico/votante/tarjeton` (bajo `VotoGuard`, que revalida **todas** las condiciones en cada llamada — ver arquitectura §4.4). Devuelve las dignidades elegibles para el tipo de elector (`DOCENTE`/`ESTUDIANTE`/`AMBOS`), cada una con sus candidaturas `CALIFICADA` y no excluidas de segunda vuelta.

En la UI, cada dignidad se presenta como una "cédula" separada (una pantalla por dignidad), con opciones: cada candidato/lista, **voto en blanco** o **voto nulo** explícitos. Por defecto, si no se marca nada, se asume `BLANCO`.

### 6.5 Confirmación y emisión

Tras revisar el resumen de todas sus selecciones (con advertencia de que la acción es irreversible), el votante confirma. `POST /publico/votante/emitir` valida en el servidor:
- Debe traer exactamente una selección por cada dignidad elegible (ni de más ni de menos, sin duplicados).
- Cada `dignidadId` debe pertenecer al elector/elección.
- Cada voto por candidato debe apuntar a una candidatura `CALIFICADA` y no excluida de segunda vuelta; voto blanco/nulo no debe traer `candidaturaId`.
- El elector no debe haber votado ya (verificación repetida, contra condición de carrera).

**Efecto transaccional (todo o nada):**
1. Se crea un `VotoEmitido` por cada dignidad (solo certifica "votó", sin guardar la opción elegida).
2. Se incrementa el `ConteoVoto` agregado (elección+dignidad+opción) — este es el único lugar donde vive el resultado real.
3. Si el elector tiene carrera asignada, se incrementa también `ConteoVotoCarrera` (agregado estadístico, sin vínculo al elector individual — preserva el secreto del voto).
4. **La credencial del elector se revoca inmediatamente** (`credencialHash = null`, `credencialRevocadaAt`) — la contraseña que recibió por correo deja de servir para siempre, incluso si técnicamente reintentara. Esto es "la credencial se invalida cuando se registra el voto", tal como se le advierte en el propio correo.

### 6.6 Comprobante de votación

La respuesta incluye un comprobante (código = id del `VotoEmitido`, fecha, datos del elector y la elección). El **frontend** (no el backend) dibuja un PNG tipo certificado con un pseudo-código de barras derivado del código de comprobante, y lo descarga automáticamente. El comprobante **no revela la selección realizada** — solo certifica que el elector votó.

### 6.7 Cierre de sesión y modo kiosco

Tras emitir el voto, se limpia el token de voto (`venp_voto_token`) y la pantalla vuelve automáticamente al login tras 90 segundos (con opción de "Finalizar ahora"), pensado para dispositivos compartidos/kiosco.

### 6.8 Casos de error visibles al votante

Cualquier rechazo del backend (credenciales inválidas, votación no disponible, elección no abierta, ya votó, sesión de voto expirada/revocada) se muestra tal cual devuelve la API, en español, vía notificación en pantalla — no hay mensajes genéricos que oculten la causa real, lo que también significa que el mensaje debe redactarse con cuidado en el backend si se modifica.

---

## 7. Generación y envío de credenciales — flujo detallado

Este sub-flujo es transversal a las fases 2 y 4, y merece detalle propio porque es la causa más común de bloqueo del Paso 3 de la jornada.

1. El administrador dispara "Generar y enviar credenciales" (o el reenvío de pendientes) desde Padrón/Jornada.
2. El sistema exige que el correo esté configurado (`correo.asegurarConfigurado()` — falla si `MAIL_MODE=smtp` pero falta `SMTP_HOST`/`SMTP_FROM`).
3. Selecciona todo el padrón **publicado + `HABILITADO` + elector activo + sin voto ya emitido** que tenga credencial pendiente (nunca generada, no enviada, revocada, o con error de envío previo).
4. Separa los que **sí tienen correo** de los que no (`sinCorreo`) — estos últimos no se procesan y quedan reportados aparte.
5. Genera una clave de 12 caracteres por elector, la hashea (bcrypt, coste 12), y **antes de confirmar el envío** ya actualiza `credencialHash`/`credencialGeneradaAt`/incrementa `credencialVersion` en base de datos, en lotes de 8.
6. Envía los correos en lotes de 10 en paralelo. Cada envío exitoso marca `credencialEnviadaAt`; cada fallo guarda el mensaje de error en `credencialEnvioError` (recortado a 1000 caracteres) sin abortar el resto del lote.
7. Devuelve un resumen: `pendientes`, `sinCorreo`, `enviadas`, `fallidas`.

**Consecuencia operativa:** si `fallidas > 0` o `sinCorreo > 0`, esos electores seguirán apareciendo como "credencial pendiente" en el resumen que consume el Paso 3 de la jornada, y **bloquearán el inicio de la votación** hasta que se corrija el dato (correo) y se reintente el envío, o se inhabilite a ese elector del padrón.

---

## 8. Resultados y cierre del proceso

Tras el Paso 5 de la jornada (`RESULTADOS_PROVISIONALES`), el flujo normativo completo de la elección contempla (a nivel de `EstadoEleccion`, gestionable desde el módulo de escrutinio si se reactiva en el frontend — ver arquitectura §4.5):

- **`IMPUGNACION_RESULTADOS`** (opcional) — ventana para impugnar resultados provisionales, con `ImpugnacionResultado` (fundamento, respaldo de identificaciones, plazo de resolución).
- **`RESULTADOS_DEFINITIVOS`** — cierre definitivo del conteo.
- **`POSESIONADA`** — estado terminal, la elección concluyó y sus ganadores fueron posesionados.
- **`ANULADA`** — salida de emergencia disponible desde casi cualquier estado no terminal, para procesos que deben cancelarse por completo.

En la operación actual del panel de Jornada, la pantalla de **Resultados** (`elecciones/resultados`) es el punto de consulta: totales por dignidad, participación general y por carrera (con umbral de privacidad — una carrera con menos de 5 votantes no publica su detalle desagregado, solo el agregado), exportación CSV, descarga de actas en PDF (`reportes/`) e impresión.

---

## 9. Resumen visual del camino crítico (happy path)

```
1. Crear elección (BORRADOR)
2. Configurar branding + cronograma (validar Art. 9, plazos de 10d/24h)
3. Definir dignidades
4. Cargar/activar electores → asignar al padrón → publicar padrón (PADRON_PUBLICADO)
5. Abrir candidaturas (CANDIDATURAS_ABIERTAS) → registrar listas/candidaturas
6. Calificar candidaturas (resolver subsanaciones/impugnaciones) → cerrar calificación
   (CANDIDATURAS_CALIFICADAS)
7. [Campaña] (CAMPANIA)
8. Jornada Paso 1: Inicializar (padrón publicado + candidaturas calificadas)
9. Jornada Paso 2: Puesta a cero (0 votos)
10. Generar y enviar credenciales al 100% del padrón habilitado (correos @yavirac.edu.ec)
11. Jornada Paso 3: Iniciar votación (VOTACION_ABIERTA, link activo) — dentro de la ventana
    de fechaInicioVotacion/fechaFinVotacion del cronograma
12. El votante: login → tarjetón → confirmar → emitir voto → comprobante
    (credencial se revoca al votar)
13. Jornada Paso 4: Cerrar votación (después de fechaFinVotacion) (VOTACION_CERRADA)
14. Jornada Paso 5: Generar resultados (después de fechaPublicacionResultados)
    (RESULTADOS_PROVISIONALES)
15. [Impugnación de resultados, si aplica] → Resultados definitivos → Posesión
```

Cada flecha de este camino tiene, como mínimo, una precondición bloqueante documentada en las secciones anteriores. El manual del administrador (`manual-administrador.md`) retoma esta misma secuencia con instrucciones de pantalla y checklist de verificación.
