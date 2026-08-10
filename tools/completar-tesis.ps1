param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$inputFile = (Resolve-Path -LiteralPath $InputPath).Path
$outputFile = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$reportFile = [System.IO.Path]::ChangeExtension($outputFile, '.revision.txt')
$diagnosticFile = [System.IO.Path]::ChangeExtension($outputFile, '.diagnostico.txt')
$script:checkpoint = 'inicio'

$wdAlignParagraphLeft = 0
$wdAlignParagraphCenter = 1
$wdAlignParagraphJustify = 3
$wdLineSpaceSingle = 0
$wdLineSpaceOnePtFive = 1
$wdAutoFitWindow = 2
$wdStatisticWords = 0
$wdStatisticPages = 2
$wdActiveEndPageNumber = 3

function Find-TextRange {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Document,
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [int]$StartAt = 0,
        [int]$EndAt = -1,
        [bool]$Forward = $true
    )

    if ($EndAt -lt 0) {
        $EndAt = $Document.Content.End
    }
    $range = $Document.Range($StartAt, $EndAt)
    $find = $range.Find
    $find.ClearFormatting()
    $find.Text = $Text
    $find.Forward = $Forward
    $find.Wrap = 0
    $find.MatchCase = $false
    $find.MatchWholeWord = $false
    if (-not $find.Execute()) {
        throw "No se encontró el texto delimitador: $Text"
    }
    return $range
}

function Set-DefaultParagraphFormat {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Range,
        [int]$Alignment = 3,
        [double]$FirstLineIndentCm = 1.25,
        [int]$SpaceAfter = 6,
        [int]$LineSpacingRule = 1
    )

    $Range.Font.Name = 'Arial'
    $Range.Font.Size = 12
    $Range.ParagraphFormat.Alignment = $Alignment
    $Range.ParagraphFormat.FirstLineIndent = $script:word.CentimetersToPoints($FirstLineIndentCm)
    $Range.ParagraphFormat.SpaceBefore = 0
    $Range.ParagraphFormat.SpaceAfter = $SpaceAfter
    $Range.ParagraphFormat.LineSpacingRule = $LineSpacingRule
}

function Add-Paragraph {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [object]$Style = $null,
        [int]$Alignment = 3,
        [double]$FirstLineIndentCm = 1.25,
        [int]$SpaceAfter = 6,
        [switch]$Bold,
        [switch]$Italic,
        [int]$FontSize = 12
    )

    $start = $script:selection.Start
    if ($Style) {
        $script:selection.Style = $Style
    }
    $script:selection.TypeText($Text)
    $end = $script:selection.End
    $range = $script:doc.Range($start, $end)
    Set-DefaultParagraphFormat -Range $range -Alignment $Alignment -FirstLineIndentCm $FirstLineIndentCm -SpaceAfter $SpaceAfter
    $range.Font.Size = $FontSize
    $range.Font.Bold = [int][bool]$Bold
    $range.Font.Italic = [int][bool]$Italic
    $script:selection.TypeParagraph()
}

function Add-Heading {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [ValidateSet(1, 2, 3, 4)]
        [int]$Level
    )

    $style = switch ($Level) {
        1 { $script:styleH1 }
        2 { $script:styleH2 }
        3 { $script:styleH3 }
        4 { $script:styleH4 }
    }

    $start = $script:selection.Start
    $script:selection.Style = $style
    $script:selection.TypeText($Text)
    $end = $script:selection.End
    $range = $script:doc.Range($start, $end)
    $range.Font.Name = 'Arial'
    $range.Font.Bold = 1
    $range.ParagraphFormat.FirstLineIndent = 0
    $range.ParagraphFormat.SpaceAfter = 6
    $range.ParagraphFormat.KeepWithNext = -1
    if ($Level -le 2) {
        $range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
    }
    else {
        $range.ParagraphFormat.Alignment = $wdAlignParagraphLeft
    }
    $script:selection.TypeParagraph()
}

function Add-Caption {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    Add-Paragraph -Text $Text -Alignment $wdAlignParagraphLeft -FirstLineIndentCm 0 -SpaceAfter 3 -Bold -FontSize 10
}

function Add-Source {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    Add-Paragraph -Text $Text -Alignment $wdAlignParagraphLeft -FirstLineIndentCm 0 -SpaceAfter 6 -Italic -FontSize 9
}

function Add-Table {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Rows,
        [int[]]$ColumnWidths = @()
    )

    if (-not $Rows -or $Rows.Count -eq 0) {
        return
    }

    $script:checkpoint = "tabla: $($Rows.Count) filas"
    $properties = @($Rows[0].PSObject.Properties.Name)
    $tableRange = $script:selection.Range
    $table = $script:doc.Tables.Add($tableRange, $Rows.Count + 1, $properties.Count)
    $table.Borders.Enable = 1
    $table.AllowAutoFit = $true
    $table.AutoFitBehavior($wdAutoFitWindow)
    $table.Rows.Item(1).HeadingFormat = -1
    $table.Rows.Item(1).Range.Shading.BackgroundPatternColor = 12611584
    $table.Rows.Item(1).Range.Font.Color = 16777215
    $table.Rows.Item(1).Range.Font.Bold = 1

    for ($column = 1; $column -le $properties.Count; $column++) {
        $cell = $table.Cell(1, $column)
        $cell.Range.Text = $properties[$column - 1]
    }

    for ($row = 0; $row -lt $Rows.Count; $row++) {
        for ($column = 0; $column -lt $properties.Count; $column++) {
            $value = [string]$Rows[$row].($properties[$column])
            $table.Cell($row + 2, $column + 1).Range.Text = $value
        }
    }

    if ($ColumnWidths.Count -eq $properties.Count) {
        for ($column = 1; $column -le $properties.Count; $column++) {
            $table.Columns.Item($column).PreferredWidthType = 2
            $table.Columns.Item($column).PreferredWidth = $ColumnWidths[$column - 1]
        }
    }

    $table.Range.Font.Name = 'Arial'
    $table.Range.Font.Size = 8.5
    $table.Range.ParagraphFormat.SpaceBefore = 0
    $table.Range.ParagraphFormat.SpaceAfter = 0
    $table.Range.ParagraphFormat.LineSpacingRule = $wdLineSpaceSingle
    $table.Range.ParagraphFormat.FirstLineIndent = 0
    $table.Range.Cells.VerticalAlignment = 1

    $script:selection.SetRange($table.Range.End, $table.Range.End)
    $script:selection.TypeParagraph()
}

function Add-BlockDiagram {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Blocks
    )

    $range = $script:selection.Range
    $table = $script:doc.Tables.Add($range, 1, ($Blocks.Count * 2) - 1)
    $table.Borders.Enable = 1
    $table.AllowAutoFit = $true
    $table.AutoFitBehavior($wdAutoFitWindow)

    for ($index = 0; $index -lt $Blocks.Count; $index++) {
        $cellIndex = ($index * 2) + 1
        $cell = $table.Cell(1, $cellIndex)
        $cell.Range.Text = $Blocks[$index]
        $cell.Range.Shading.BackgroundPatternColor = 15132390
        $cell.Range.Font.Bold = 1
        $cell.Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        if ($index -lt $Blocks.Count - 1) {
            $arrow = $table.Cell(1, $cellIndex + 1)
            $arrow.Range.Text = '→'
            $arrow.Range.Font.Bold = 1
            $arrow.Range.Font.Size = 14
            $arrow.Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
            $arrow.Borders.Enable = 0
        }
    }

    $table.Range.Font.Name = 'Arial'
    $table.Range.Font.Size = 8.5
    $table.Range.ParagraphFormat.SpaceAfter = 0
    $table.Range.ParagraphFormat.LineSpacingRule = $wdLineSpaceSingle
    $table.Range.Cells.VerticalAlignment = 1
    $script:selection.SetRange($table.Range.End, $table.Range.End)
    $script:selection.TypeParagraph()
}

function Add-Wireframe {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,
        [Parameter(Mandatory = $true)]
        [string[]]$Sections
    )

    $range = $script:selection.Range
    $table = $script:doc.Tables.Add($range, $Sections.Count + 1, 1)
    $table.Borders.Enable = 1
    $table.AllowAutoFit = $true
    $table.AutoFitBehavior($wdAutoFitWindow)
    $table.Cell(1, 1).Range.Text = $Title
    $table.Cell(1, 1).Range.Shading.BackgroundPatternColor = 12611584
    $table.Cell(1, 1).Range.Font.Color = 16777215
    $table.Cell(1, 1).Range.Font.Bold = 1
    $table.Cell(1, 1).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
    for ($index = 0; $index -lt $Sections.Count; $index++) {
        $table.Cell($index + 2, 1).Range.Text = $Sections[$index]
        if ($index % 2 -eq 0) {
            $table.Cell($index + 2, 1).Range.Shading.BackgroundPatternColor = 15921906
        }
    }
    $table.Range.Font.Name = 'Arial'
    $table.Range.Font.Size = 9
    $table.Range.ParagraphFormat.SpaceAfter = 0
    $table.Range.ParagraphFormat.FirstLineIndent = 0
    $table.Range.ParagraphFormat.LineSpacingRule = $wdLineSpaceSingle
    $script:selection.SetRange($table.Range.End, $table.Range.End)
    $script:selection.TypeParagraph()
}

$actors = @'
Actor|Responsabilidad en el sistema|Acceso principal
Administrador electoral|Configura elecciones, cronograma, dignidades, padrón, candidaturas, jornada, escrutinio e impugnaciones.|Panel administrativo protegido por JWT, rol y opciones de perfil.
Elector habilitado|Recibe una credencial individual, consulta el tarjetón y emite una selección por cada dignidad habilitada.|Portal público de votación durante la jornada abierta.
Visitante público|Consulta convocatoria, actividades, candidaturas, participación y resultados cuando el estado de la elección lo permite.|Sitio informativo sin autenticación administrativa.
Responsable técnico|Instala, configura, migra y mantiene la aplicación y la base de datos.|Repositorio, variables de entorno, Prisma Migrate y registros técnicos.
'@ | ConvertFrom-Csv -Delimiter '|'

$functionalRequirements = @'
Código|Requerimiento funcional|Actor|Prioridad|Criterio de aceptación
RF-01|Autenticar al usuario administrativo mediante usuario y contraseña, verificando que la cuenta esté activa.|Administrador|Alta|Con credenciales válidas devuelve un JWT y el perfil; con credenciales inválidas rechaza el acceso.
RF-02|Forzar el cambio de contraseña cuando la cuenta lo requiera o la fecha de caducidad haya vencido.|Administrador|Alta|El inicio de sesión entrega un token temporal y no habilita el panel hasta registrar una contraseña nueva.
RF-03|Construir el menú y las rutas permitidas según el rol, perfil y opciones asignadas.|Administrador|Alta|Solo se muestran y habilitan las opciones autorizadas para la cuenta autenticada.
RF-04|Crear, consultar, actualizar, activar o desactivar usuarios administrativos y restablecer sus contraseñas.|Administrador|Alta|Las operaciones modifican únicamente el usuario seleccionado y quedan disponibles en la API de usuarios.
RF-05|Gestionar perfiles, opciones de navegación y la relación entre ambos.|Administrador|Media|Un perfil puede recibir o perder opciones y el cambio se refleja en el menú autorizado.
RF-06|Consultar la auditoría mediante filtros de tabla, operación, usuario, registro y fecha.|Administrador|Alta|La consulta devuelve eventos paginados que coinciden con los filtros solicitados.
RF-07|Crear, listar, consultar y actualizar elecciones institucionales.|Administrador|Alta|Cada elección conserva nombre, tipo, descripción, estado, vuelta y fechas asociadas.
RF-08|Configurar identidad institucional, logotipos, colores, video y mensaje de bienvenida por elección.|Administrador|Media|La configuración se guarda de forma única para la elección y se refleja en el portal público.
RF-09|Registrar y actualizar el cronograma electoral de convocatoria, padrón, candidaturas, campaña, votación e impugnaciones.|Administrador|Alta|Las fechas quedan asociadas de manera única a la elección seleccionada.
RF-10|Crear, editar y desactivar dignidades, indicando orden, cantidad de ganadores y tipo de elector permitido.|Administrador|Alta|El tarjetón contiene únicamente dignidades activas y aplicables al tipo de elector.
RF-11|Gestionar electores y sus catálogos de carrera, nivel, paralelo y jornada académica.|Administrador|Alta|Cada elector conserva identificación única, datos personales, tipo y pertenencia académica.
RF-12|Asignar electores al padrón de una elección de forma manual o mediante generación automática.|Administrador|Alta|No se duplica la pareja elección-elector y se registra su estado de habilitación.
RF-13|Publicar el padrón y registrar fecha de publicación para los electores habilitados.|Administrador|Alta|La elección dispone de un padrón publicado consultable por sus procesos posteriores.
RF-14|Generar, enviar, reenviar y revocar credenciales de votación individualizadas.|Administrador|Alta|La contraseña se almacena como hash, se registra la versión y se controla el estado de envío.
RF-15|Crear y actualizar listas electorales con código, nombre, color, lema y estado.|Administrador|Alta|No se repite el código de lista dentro de la misma elección.
RF-16|Inscribir candidaturas relacionando elección, dignidad, elector y lista.|Administrador|Alta|No se duplica una candidatura para la misma elección, dignidad y elector.
RF-17|Calificar, rechazar, retirar y cerrar la fase de calificación de candidaturas.|Administrador|Alta|Solo las candidaturas calificadas aparecen en el tarjetón público.
RF-18|Inicializar la jornada únicamente cuando exista padrón publicado y candidaturas calificadas.|Administrador|Alta|El sistema bloquea la inicialización si falta cualquiera de las precondiciones.
RF-19|Ejecutar la puesta a cero antes de abrir la votación.|Administrador|Alta|La operación se aprueba solo cuando no existen votos previos y queda registrada como evento.
RF-20|Abrir y cerrar la votación, habilitando o deshabilitando el enlace público y actualizando el estado electoral.|Administrador|Alta|El enlace se activa en VOTACION_ABIERTA y se desactiva al cerrar la jornada.
RF-21|Autenticar al elector mediante identificación y credencial vigente asociada al padrón publicado.|Elector|Alta|Solo un elector habilitado, con credencial válida y no revocada, recibe un token de votación.
RF-22|Presentar al elector un tarjetón con dignidades y candidaturas calificadas aplicables.|Elector|Alta|El tarjetón excluye candidaturas no calificadas y dignidades no permitidas para el elector.
RF-23|Permitir voto por candidatura, voto en blanco o voto nulo para cada dignidad.|Elector|Alta|Cada selección se valida contra los tipos CANDIDATO, BLANCO o NULO antes de persistirla.
RF-24|Impedir que un elector vote más de una vez por la misma dignidad.|Elector|Alta|La restricción única elección-dignidad-elector rechaza cualquier segundo registro.
RF-25|Revocar la credencial una vez completada la emisión del voto.|Elector|Alta|Al confirmar el voto se elimina el hash activo y se registra la fecha de revocación.
RF-26|Calcular participación con base en el padrón habilitado y los electores que votaron.|Visitante público|Media|El portal muestra padrón, votantes y porcentaje calculado para la elección.
RF-27|Consultar resultados agregados por dignidad, candidatura, blanco y nulo cuando el estado lo autorice.|Visitante público|Alta|Antes del cierre la consulta es rechazada; en estados permitidos entrega conteos agregados.
RF-28|Generar, cerrar y aprobar actas de escrutinio por dignidad.|Administrador|Alta|Cada elección-dignidad tiene una sola acta con totales de padrón, votantes y tipos de voto.
RF-29|Registrar y resolver impugnaciones asociadas a una elección, dignidad o acta.|Administrador|Alta|La impugnación conserva motivo, solicitante, estado, resolución y fechas.
RF-30|Publicar resultados provisionales y definitivos respetando la secuencia de estados.|Administrador|Alta|El sistema no permite resultados definitivos con impugnaciones pendientes.
'@ | ConvertFrom-Csv -Delimiter '|'

$userStories = @'
Historia|Enunciado|Criterios de aceptación|Prioridad
HU-01|Como administrador electoral, quiero crear una elección para organizar todos sus datos y etapas en un expediente único.|Se asigna identificador; inicia en BORRADOR; admite configuración, cronograma y dignidades.|Alta
HU-02|Como administrador, quiero generar el padrón desde los electores activos para evitar carga manual repetitiva.|No crea duplicados; permite observar o inhabilitar registros; admite publicación posterior.|Alta
HU-03|Como administrador, quiero enviar credenciales individuales para que cada elector ingrese sin una cuenta administrativa.|La clave se almacena con hash; el correo registra éxito o error; puede reenviarse si está pendiente.|Alta
HU-04|Como administrador, quiero calificar candidaturas para que solo las aprobadas aparezcan en la papeleta.|El estado queda registrado; la papeleta filtra CALIFICADA; no se admite un candidato duplicado en la misma dignidad.|Alta
HU-05|Como responsable de jornada, quiero verificar puesta a cero antes de abrir la votación para demostrar que el conteo inicia sin votos.|La operación falla si existe cualquier voto; genera evento y marca temporal.|Alta
HU-06|Como elector, quiero ingresar con mi identificación y credencial para acceder únicamente a la elección para la que estoy habilitado.|Se verifica padrón publicado, estado HABILITADO, hash vigente y versión de credencial.|Alta
HU-07|Como elector, quiero visualizar candidatos por dignidad y escoger candidatura, blanco o nulo.|Cada dignidad presenta opciones válidas; se exige exactamente una selección por dignidad habilitada.|Alta
HU-08|Como elector, quiero que el sistema confirme mi voto una sola vez sin conservar la relación entre mi identidad y la preferencia elegida.|La constancia VotoEmitido solo registra participación; la preferencia incrementa ConteoVoto; la credencial queda revocada.|Alta
HU-09|Como visitante, quiero consultar candidatos y cronograma para informarme sin ingresar al panel administrativo.|La información visible corresponde a elecciones públicas y candidaturas calificadas.|Media
HU-10|Como visitante, quiero ver participación y resultados cuando estén autorizados para conocer el avance y desenlace del proceso.|La participación usa datos agregados; los resultados se bloquean antes de los estados permitidos.|Media
HU-11|Como administrador, quiero generar actas de escrutinio para consolidar los resultados de cada dignidad.|Una acta por dignidad; incluye válidos, blancos y nulos; admite cierre y aprobación.|Alta
HU-12|Como administrador, quiero resolver impugnaciones antes de publicar resultados definitivos.|La resolución registra responsable y fecha; no se publican definitivos con casos pendientes.|Alta
'@ | ConvertFrom-Csv -Delimiter '|'

$nonFunctionalRequirements = @'
Código|Categoría|Especificación verificable|Mecanismo o evidencia
RNF-01|Seguridad de credenciales|Las contraseñas administrativas y electorales no deben almacenarse en texto legible.|bcrypt con factor de costo 12 y hashes individuales.
RNF-02|Autenticación|Las rutas administrativas deben exigir un JWT firmado y vigente.|Passport JWT, JwtStrategy y JwtAuthGuard en la API.
RNF-03|Autorización|Las funciones sensibles deben restringirse por rol, perfil y opción asignada.|RolesGuard, optionGuard y menú derivado de rutas permitidas.
RNF-04|Sesión de cliente|El token administrativo debe eliminarse al cerrar la pestaña o sesión del navegador.|Almacenamiento en sessionStorage y limpieza frente a HTTP 401 o cierre de sesión.
RNF-05|Validación|La API debe rechazar atributos no declarados y transformar los datos conforme a los DTO.|ValidationPipe global con whitelist, forbidNonWhitelisted y transform.
RNF-06|Integridad transaccional|La emisión del voto y los cambios críticos de estado deben completarse totalmente o revertirse.|Transacciones interactivas de Prisma para voto, conteo, credencial y eventos.
RNF-07|Unicidad|No debe existir voto duplicado por elección, dignidad y elector.|Índice único compuesto en VotoEmitido y verificación previa en el servicio.
RNF-08|Confidencialidad del sufragio|La identidad del elector no debe almacenarse junto con la opción elegida.|Separación entre VotoEmitido (participación) y ConteoVoto (preferencia agregada).
RNF-09|Auditabilidad|Las operaciones administrativas relevantes deben registrar actor, tabla, operación, registro, fecha e IP cuando esté disponible.|Módulo Auditoria e historial de estados/eventos de jornada.
RNF-10|Disponibilidad operativa|La aplicación debe permitir compilación independiente de frontend y backend y recuperación mediante respaldo de PostgreSQL.|Monorepo pnpm/Turborepo, scripts build y procedimiento de respaldo.
RNF-11|Compatibilidad|La interfaz debe funcionar en navegadores modernos con JavaScript y diseño adaptable.|Angular, Angular Material y Tailwind CSS con componentes responsivos.
RNF-12|Usabilidad|Los flujos críticos deben mostrar estado, validaciones y mensajes comprensibles sin exponer detalles internos.|Manejo centralizado de errores, diálogos de confirmación y navegación por etapas.
RNF-13|Accesibilidad|La interfaz debe conservar navegación por teclado, foco visible, etiquetas y contraste suficiente en acciones críticas.|Criterios WCAG 2.2 nivel AA aplicables a formularios, botones y mensajes.
RNF-14|Mantenibilidad|La solución debe separar presentación, lógica de negocio y persistencia, y mantener contratos tipados.|Componentes/servicios Angular; controladores/servicios NestJS; DTO y Prisma Client tipados.
RNF-15|Portabilidad de configuración|Los secretos y direcciones de servicios no deben quedar codificados en el repositorio.|Variables DATABASE_URL, JWT_SECRET, SMTP y PUBLIC_APP_URL en archivo .env no versionado.
'@ | ConvertFrom-Csv -Delimiter '|'

$businessRules = @'
Regla|Descripción|Soporte técnico
RN-01|Una elección avanza mediante estados controlados desde BORRADOR hasta RESULTADOS_DEFINITIVOS, POSESIONADA o ANULADA.|EstadoEleccion e historial de transiciones.
RN-02|La jornada no se inicializa sin padrón publicado y al menos una candidatura calificada.|Validación en JornadaService.
RN-03|La puesta a cero solo se registra cuando el conteo de votos emitidos es igual a cero.|Consulta previa y transacción de jornada.
RN-04|La votación pública solo está disponible en VOTACION_ABIERTA y con linkVotacionActivo.|Validación del servicio público y jornada.
RN-05|El elector debe pertenecer al padrón publicado, estar HABILITADO y disponer de credencial vigente.|PadronElectoral y validación bcrypt.
RN-06|Cada elector puede emitir una constancia por dignidad en una elección.|Restricción única compuesta en VotoEmitido.
RN-07|Cada dignidad exige una opción válida: candidatura calificada, blanco o nulo.|TipoVoto y validación de candidaturas.
RN-08|Al completar la votación se revoca la credencial para impedir su reutilización.|credencialHash nulo y credencialRevocadaAt.
RN-09|Los resultados se consultan únicamente después del cierre o en estados posteriores autorizados.|RESULT_STATES del servicio público.
RN-10|No se publican resultados definitivos mientras existan impugnaciones pendientes.|Validación del módulo de escrutinio.
RN-11|Existe como máximo una acta por elección y dignidad y un número de acta irrepetible.|Restricciones únicas de ActaEscrutinio.
RN-12|Los eventos y cambios de estado conservan usuario, comentario y marca temporal.|JornadaEvento e HistorialEstadoEleccion.
'@ | ConvertFrom-Csv -Delimiter '|'

$architectureComponents = @'
Componente|Tecnología real|Responsabilidad|Comunicación
Cliente web público|Angular 22, TypeScript, Angular Material y Tailwind CSS|Presentar convocatoria, candidatos, participación, resultados, autenticación del elector y tarjetón.|Solicitudes JSON al prefijo /api/v1.
Panel administrativo|Angular 22 con rutas protegidas, servicios e interceptor HTTP|Administrar seguridad, elecciones, padrón, candidaturas, jornada y escrutinio.|JWT Bearer y servicios HttpClient.
API REST|NestJS 11 y TypeScript|Exponer controladores versionados, validar DTO, aplicar guardas y coordinar reglas de negocio.|HTTP/HTTPS; respuestas JSON y códigos HTTP.
Servicios de dominio|Módulos NestJS|Ejecutar reglas electorales, transacciones, cambios de estado, auditoría y envío de credenciales.|Inyección de dependencias y PrismaService.
Capa de persistencia|Prisma ORM 7|Ofrecer acceso tipado, relaciones, migraciones y transacciones.|Cliente Prisma sobre el adaptador PostgreSQL.
Base de datos|PostgreSQL 17 o superior|Conservar usuarios, elección, padrón, candidaturas, participación, conteos, actas e historial.|Claves, relaciones, índices y restricciones únicas.
Servicio de correo|Nodemailer con modo preview o SMTP|Entregar credenciales de votación y registrar fallos de envío.|SMTP institucional en producción.
'@ | ConvertFrom-Csv -Delimiter '|'

$apiModules = @'
Módulo|Operaciones representativas|Propósito
auth|POST /auth/login; POST /auth/reset-password; GET/PATCH /auth/me|Sesión administrativa, cambio forzado y perfil.
users|GET/POST/PATCH /users; POST /users/:id/reset-password|Administración de cuentas.
seguridad|GET /seguridad/mi-menu; CRUD de perfiles y opciones|Autorización por rol, perfil y pantalla.
auditoria|GET /auditoria|Trazabilidad de operaciones.
elecciones|CRUD /elecciones; configuración, cronograma y dignidades|Definición y ciclo de la elección.
padrones|Electores; asignación; auto-generación; publicación; credenciales|Gestión del universo electoral.
candidaturas|Listas, inscripción y calificación|Oferta electoral por dignidad.
jornada|Inicializar; puesta a cero; iniciar/cerrar; resultados|Control operativo del día electoral.
votacion|Tarjetón; votar; resultados|Reglas de emisión y agregación.
publico|Elecciones; candidatos; participación; login del votante; emitir|Experiencia pública y del elector.
escrutinio|Actas; provisionales; impugnaciones; definitivos|Consolidación y resolución de resultados.
correo|Estado y buzón de pruebas|Soporte de entrega de credenciales.
'@ | ConvertFrom-Csv -Delimiter '|'

$securityControls = @'
Control|Implementación comprobada en el repositorio|Riesgo mitigado
Hash de contraseñas|bcrypt con costo 12 para cambios administrativos y credenciales electorales.|Exposición inmediata de claves y ataques de fuerza bruta.
JWT administrativo|Token firmado con JWT_SECRET y expiración configurable.|Suplantación y acceso sin sesión válida.
Token temporal de restablecimiento|JWT de tipo reset y vigencia separada.|Uso del token de cambio como sesión completa.
Sesión del navegador|access_token y auth_user en sessionStorage; limpieza en 401 y logout.|Persistencia innecesaria de la sesión entre cierres.
Guardas y perfiles|JwtAuthGuard, RolesGuard, optionGuard y rutas permitidas.|Control de acceso roto.
Validación de entrada|DTO, class-validator y ValidationPipe estricto.|Atributos inesperados, datos inválidos e inyección por entradas no controladas.
Transacciones|Prisma $transaction en voto, conteo, revocación y cambios de jornada.|Estados parciales e inconsistencia entre tablas.
Restricciones de base de datos|Claves foráneas, UUID, índices y restricciones únicas compuestas.|Duplicidad y referencias inválidas.
Auditoría|Registro de tabla, operación, actor, IP, valores previos/nuevos e historial electoral.|Ausencia de trazabilidad.
Configuración externa|Secretos, base, correo y URL pública mediante variables de entorno.|Credenciales incrustadas en código y configuración no portable.
'@ | ConvertFrom-Csv -Delimiter '|'

$entityGroups = @'
Grupo|Entidades|Llaves y relaciones principales|Finalidad
Seguridad|Usuario, Perfil, Opcion, PerfilOpcion|Usuario.perfilId; PK compuesta perfilId-opcionId; usuario, código y ruta únicos.|Autenticación, autorización y menú dinámico.
Proceso electoral|Eleccion, ConfiguracionEleccion, CronogramaElectoral, HistorialEstadoEleccion|Configuración y cronograma 1:1 con Eleccion; historial 1:N.|Definición, planificación y trazabilidad de estados.
Catálogos académicos|Carrera, Nivel, Paralelo, Jornada|Nombre único; relaciones opcionales 1:N con Elector.|Clasificación del electorado.
Electorado|Elector, PadronElectoral|Identificación única; pareja eleccionId-electorId única.|Datos maestros, habilitación y credenciales.
Oferta electoral|Dignidad, ListaElectoral, Candidatura|Lista única por elección-código; candidatura única por elección-dignidad-elector.|Cargos, listas y postulaciones calificadas.
Votación|VotoEmitido, ConteoVoto|Constancia única por elección-dignidad-elector; conteo único por opción.|Control de unicidad y acumulación separada de la preferencia.
Jornada|JornadaElectoral, JornadaEvento|Jornada 1:1 con elección; eventos 1:N.|Puesta a cero, apertura, cierre y marcas operativas.
Escrutinio|ActaEscrutinio, DetalleActaEscrutinio, ImpugnacionResultado|Acta única por elección-dignidad; detalle único por acta-opción.|Consolidación, aprobación e impugnaciones.
Control|Auditoria|Índices por tabla, fecha y registro.|Evidencia de operaciones administrativas.
'@ | ConvertFrom-Csv -Delimiter '|'

$criticalDictionary = @'
Entidad/Campo|Tipo lógico|Restricción|Interpretación
Eleccion.id|UUID|PK|Identificador del proceso electoral.
Eleccion.estado|Enum EstadoEleccion|Indexado|Etapa vigente del ciclo electoral.
PadronElectoral.eleccionId + electorId|UUID + UUID|Único compuesto y FK|Evita repetir un elector en el mismo padrón.
PadronElectoral.credencialHash|Cadena opcional|Hash bcrypt|Credencial vigente; se elimina al consumirla.
PadronElectoral.credencialVersion|Entero|Valor incremental|Invalida tokens de versiones anteriores.
Candidatura.eleccionId + dignidadId + electorId|UUID compuestos|Único compuesto|Impide doble inscripción en una dignidad.
VotoEmitido.eleccionId + dignidadId + electorId|UUID compuestos|Único compuesto|Demuestra participación sin registrar la opción escogida.
ConteoVoto.opcionKey|Cadena|Único con elección y dignidad|Agrupa candidatura, BLANCO o NULO.
ConteoVoto.total|Entero|Valor no negativo por lógica|Acumulador de preferencias.
JornadaElectoral.eleccionId|UUID|Único y FK|Una jornada operativa por elección.
ActaEscrutinio.eleccionId + dignidadId|UUID compuestos|Único compuesto|Una acta consolidada por dignidad.
ImpugnacionResultado.estado|Enum|Indexado|PENDIENTE, ACEPTADA o RECHAZADA.
Auditoria.id|Entero autoincremental|PK|Secuencia del evento auditable.
'@ | ConvertFrom-Csv -Delimiter '|'

$uiScreens = @'
Pantalla|Usuario|Contenido y acciones|Validaciones principales
Inicio público|Visitante|Identidad institucional, mensaje, actividades, cronograma y accesos a candidatos, votar, participación y resultados.|Solo muestra elecciones en estados públicos.
Candidatos|Visitante|Dignidades, listas, nombre, fotografía y datos básicos de candidaturas calificadas.|Excluye candidaturas no calificadas.
Acceso del votante|Elector|Identificación, contraseña electoral y selección de elección activa.|Padrón publicado, habilitación, hash vigente y jornada abierta.
Tarjetón|Elector|Bloques por dignidad con candidato, blanco y nulo; resumen antes de confirmar.|Una opción válida por dignidad y confirmación explícita.
Resultados|Visitante|Participación, votos válidos, blancos, nulos y totales por candidatura.|Bloqueado antes del cierre.
Inicio de sesión administrativo|Administrador|Usuario, contraseña y flujo de cambio forzado.|Mensajes genéricos ante credenciales inválidas.
Panel administrativo|Administrador|Resumen del proceso y navegación autorizada.|Menú según perfil y rol.
Elecciones|Administrador|Listado, creación, edición, configuración, cronograma y dignidades.|Campos DTO y transiciones permitidas.
Padrón y electores|Administrador|Catálogos, electores, asignación, publicación y credenciales.|Identificación y pareja elección-elector únicas.
Candidaturas|Administrador|Listas, inscripción y calificación.|Candidato, dignidad y lista válidos.
Jornada|Administrador|Inicialización, puesta a cero, envío de credenciales, apertura, cierre y resultados.|Precondiciones secuenciales y confirmaciones.
Escrutinio|Administrador|Actas, aprobación, provisionales, impugnaciones y definitivos.|No permite definitivos con pendientes.
'@ | ConvertFrom-Csv -Delimiter '|'

$implementationStructure = @'
Ruta|Contenido|Responsabilidad
apps/web/src/app/features/website|Páginas públicas, servicios y rutas.|Información, candidatos, votación, participación y resultados.
apps/web/src/app/features/admin|Módulos y páginas administrativas.|Seguridad, elecciones, padrón, candidaturas, jornada y escrutinio.
apps/web/src/app/layout|Diseños, navegación y componentes comunes.|Separación de sitio público, autenticación y panel.
apps/web/src/@core|Servicios, navegación, estilos y componentes base.|Infraestructura visual reutilizable.
apps/api/src/modules|Controladores, servicios, DTO, guardas y decoradores.|API modular y reglas de negocio.
apps/api/src/prisma|PrismaModule y PrismaService.|Conexión y acceso tipado a datos.
apps/api/prisma/schema.prisma|Veinticinco modelos y enumeraciones.|Contrato relacional de la base de datos.
apps/api/prisma/migrations|Migraciones SQL versionadas.|Evolución reproducible del esquema.
apps/api/prisma/seed.ts|Perfiles, opciones y datos de arranque.|Configuración inicial controlada.
apps/api/test|Configuración de pruebas de extremo a extremo.|Base para automatización con Jest/Supertest.
'@ | ConvertFrom-Csv -Delimiter '|'

$implementedModules = @'
Área|Implementación concreta|Resultado técnico
Seguridad administrativa|Inicio de sesión, cambio forzado, perfil, usuarios, roles, perfiles, opciones y auditoría.|Acceso segmentado y menú dinámico.
Elecciones|CRUD, configuración visual, cronograma, dignidades y estados.|Expediente electoral centralizado.
Electores y padrón|Catálogos, electores, fotografía, asignación, auto-generación y publicación.|Universo electoral consistente y sin duplicados.
Credenciales|Generación bcrypt, versión, envío SMTP/preview, reenvío y revocación.|Acceso individual de elector sin crear una cuenta administrativa.
Listas y candidaturas|Registro de listas, inscripción, edición y calificación.|Tarjetón construido solo con opciones aprobadas.
Jornada|Inicialización, puesta a cero, apertura, cierre, reactivación y eventos.|Secuencia operativa con precondiciones y trazabilidad.
Votación|Login del votante, tarjetón, validación por dignidad y transacción de emisión.|Unicidad del voto y separación identidad-preferencia.
Portal público|Convocatoria, actividades, candidatos, participación y resultados.|Consulta institucional sin acceso al panel.
Escrutinio|Conteos, actas, cierre, aprobación, provisionales, impugnaciones y definitivos.|Consolidación posterior al cierre con control de pendientes.
Persistencia|Prisma 7, PostgreSQL, claves foráneas, índices y migraciones.|Modelo relacional tipado y reproducible.
'@ | ConvertFrom-Csv -Delimiter '|'

$functionalTests = @'
Caso|Requisito|Acción|Resultado esperado|Resultado documentado|Estado
CPF-01|RF-01|Ingresar credenciales administrativas válidas.|Entrega JWT y perfil con menú permitido.|AuthService compara bcrypt y genera access_token.|Conforme por inspección
CPF-02|RF-01|Ingresar credenciales inválidas o cuenta inactiva.|Rechaza el acceso sin revelar qué dato falló.|Se lanzan excepciones de autenticación o cuenta inactiva.|Conforme por inspección
CPF-03|RF-02|Ingresar con cambiarPassword o contraseña caducada.|Entrega únicamente token temporal de restablecimiento.|La API evalúa ambos indicadores antes del token normal.|Conforme por inspección
CPF-04|RF-03|Solicitar una ruta administrativa no asignada.|Bloquea la navegación y el endpoint protegido.|Guardas de rol/opción y rutasPermitidas controlan el acceso.|Conforme por inspección
CPF-05|RF-04|Crear y luego desactivar un usuario.|La cuenta queda registrada y no puede autenticarse inactiva.|UsersService mantiene el estado; AuthService lo verifica.|Conforme por inspección
CPF-06|RF-06|Filtrar auditoría por tabla, operación y fecha.|Devuelve únicamente coincidencias paginadas.|El controlador acepta QueryAuditoriaDto y el servicio construye filtros.|Conforme por inspección
CPF-07|RF-07|Crear una elección con datos válidos.|Se registra con identificador y estado BORRADOR.|EleccionesService y modelo Eleccion soportan el alta.|Conforme por inspección
CPF-08|RF-09|Actualizar el cronograma de una elección.|Se conserva un único cronograma asociado.|eleccionId es único en CronogramaElectoral.|Conforme por inspección
CPF-09|RF-10|Crear y desactivar una dignidad.|La dignidad activa aparece; la desactivada deja de ofertarse.|Consultas públicas filtran activo=true.|Conforme por inspección
CPF-10|RF-11|Registrar dos electores con la misma identificación.|El segundo registro es rechazado.|Elector.identificacion posee restricción única.|Conforme por inspección
CPF-11|RF-12|Asignar dos veces el mismo elector a una elección.|No se crea un padrón duplicado.|Índice único eleccionId-electorId.|Conforme por inspección
CPF-12|RF-13|Publicar un padrón válido.|Los registros quedan publicados con fecha.|Endpoint de publicación y campos publicado/fechaPublicacion.|Conforme por inspección
CPF-13|RF-14|Generar una credencial electoral.|Se almacena hash, versión y fecha; la clave legible solo se usa para el envío.|PadronElectoral separa hash y metadatos de entrega.|Conforme por inspección
CPF-14|RF-15|Crear dos listas con igual código en una elección.|La segunda operación es rechazada.|Índice único eleccionId-codigo.|Conforme por inspección
CPF-15|RF-16|Inscribir dos veces al mismo elector en igual dignidad.|La duplicación es rechazada.|Índice único elección-dignidad-elector en Candidatura.|Conforme por inspección
CPF-16|RF-17|Consultar candidatos públicos con estados mixtos.|Solo aparecen candidaturas CALIFICADA.|PublicoService aplica filtro de estado.|Conforme por inspección
CPF-17|RF-18|Inicializar jornada sin padrón publicado.|La operación se bloquea con un mensaje de precondición.|JornadaService cuenta padrón habilitado y publicado.|Conforme por inspección
CPF-18|RF-18|Inicializar jornada sin candidaturas calificadas.|La operación se bloquea.|JornadaService exige al menos una candidatura calificada.|Conforme por inspección
CPF-19|RF-19|Ejecutar puesta a cero cuando existen votos.|La operación falla e informa el total detectado.|JornadaService cuenta VotoEmitido antes de continuar.|Conforme por inspección
CPF-20|RF-20|Iniciar votación con credenciales pendientes.|No se abre el enlace público.|JornadaService verifica correos y credenciales enviadas.|Conforme por inspección
CPF-21|RF-21|Autenticar elector fuera del padrón o con clave incorrecta.|No se emite token de votante.|VotacionService valida padrón, hash y compare bcrypt.|Conforme por inspección
CPF-22|RF-22|Solicitar tarjetón para elector habilitado.|Devuelve dignidades aplicables y candidaturas calificadas.|El servicio filtra por tipo de elector, activo y estado.|Conforme por inspección
CPF-23|RF-23|Enviar candidatura que no pertenece a la dignidad.|La selección es rechazada.|La lógica valida candidatura, dignidad, elección y estado.|Conforme por inspección
CPF-24|RF-24|Reintentar voto en la misma dignidad.|El segundo registro es rechazado.|Verificación yaVoto e índice único compuesto.|Conforme por inspección
CPF-25|RF-25|Completar correctamente el voto.|Se crean constancias, se incrementan conteos y se revoca la credencial en una transacción.|emitirVotante usa Prisma $transaction para las tres acciones.|Conforme por inspección
CPF-26|RF-26|Consultar participación de una elección pública.|Devuelve padrón, votantes y porcentaje.|PublicoService calcula votantes distintos sobre padrón habilitado.|Conforme por inspección
CPF-27|RF-27|Consultar resultados antes del cierre.|La API rechaza la consulta.|RESULT_STATES excluye estados anteriores al cierre.|Conforme por inspección
CPF-28|RF-28|Generar actas para una elección cerrada.|Crea una acta por dignidad con sus detalles.|Restricciones únicas y servicio de escrutinio consolidan conteos.|Conforme por inspección
CPF-29|RF-29|Resolver una impugnación pendiente.|Registra decisión, resolución, responsable y fecha.|ImpugnacionResultado dispone de estado y metadatos de resolución.|Conforme por inspección
CPF-30|RF-30|Publicar definitivos con impugnaciones pendientes.|La operación es bloqueada.|EscrutinioService verifica pendientes antes del cambio de estado.|Conforme por inspección
'@ | ConvertFrom-Csv -Delimiter '|'

$securityTests = @'
Caso|Objetivo|Procedimiento|Criterio de aprobación|Estado documental
CPS-01|Validación estricta|Enviar un atributo no definido por el DTO.|HTTP 400 y ningún cambio persistido.|Mecanismo configurado
CPS-02|JWT ausente|Solicitar un endpoint administrativo sin Authorization.|HTTP 401.|Mecanismo configurado
CPS-03|JWT expirado|Usar un token fuera de vigencia.|HTTP 401 y limpieza de sessionStorage.|Mecanismo configurado
CPS-04|Rol insuficiente|Usar una cuenta USER sobre una función ADMIN.|HTTP 403 o navegación bloqueada.|Mecanismo configurado
CPS-05|Opción no asignada|Abrir una ruta fuera del perfil.|Acceso denegado y menú sin esa opción.|Mecanismo configurado
CPS-06|Clave almacenada|Inspeccionar registros de usuario y credencial.|Solo existen hashes bcrypt, nunca la clave original.|Mecanismo configurado
CPS-07|Atomicidad del voto|Provocar un error dentro de la transacción de emisión.|No queda constancia, conteo ni revocación parcial.|Mecanismo configurado
CPS-08|Duplicidad concurrente|Enviar dos votos de igual elector y dignidad.|Solo uno se confirma; el otro viola la unicidad.|Mecanismo configurado
CPS-09|Resultados anticipados|Consultar resultados con elección abierta.|La API no entrega conteos.|Mecanismo configurado
CPS-10|Trazabilidad|Ejecutar un cambio administrativo relevante.|Se registra actor, operación, entidad y fecha.|Mecanismo configurado
'@ | ConvertFrom-Csv -Delimiter '|'

$uatScenarios = @'
Escenario|Usuario evaluador|Tarea|Criterio de aceptación|Registro requerido
UAT-01|Responsable electoral|Crear y configurar una elección completa.|Completa el flujo sin asistencia técnica ni datos inconsistentes.|Firma, fecha y observaciones.
UAT-02|Responsable electoral|Generar y publicar el padrón.|Identifica habilitados y confirma la publicación.|Captura o acta.
UAT-03|Responsable electoral|Registrar listas y calificar candidaturas.|El tarjetón muestra solo candidaturas aprobadas.|Captura o acta.
UAT-04|Responsable de jornada|Inicializar, verificar cero y abrir votación.|Las etapas se ejecutan en orden y el enlace queda activo.|Acta de jornada.
UAT-05|Elector de prueba|Ingresar con credencial y completar el tarjetón.|Comprende las opciones, confirma una vez y recibe confirmación.|Formulario de satisfacción.
UAT-06|Elector de prueba|Intentar reutilizar la credencial.|El segundo acceso o voto es rechazado.|Registro del resultado.
UAT-07|Responsable electoral|Cerrar, generar actas y publicar provisionales.|Los totales coinciden con los datos de prueba.|Acta de verificación.
UAT-08|Responsable electoral|Registrar y resolver una impugnación; publicar definitivos.|No se publican definitivos hasta resolver pendientes.|Acta de conformidad.
'@ | ConvertFrom-Csv -Delimiter '|'

$deploymentRequirements = @'
Elemento|Versión o valor de referencia|Uso
Node.js|24 o superior|Ejecución de herramientas, frontend y backend.
pnpm|10.33.2|Instalación del workspace y scripts.
Turborepo|2.9.x|Coordinación de compilación y desarrollo del monorepo.
Angular|22.x|Compilación del cliente web.
NestJS|11.x|Compilación y ejecución de la API.
Prisma ORM|7.8.x|Generación de cliente y migraciones.
PostgreSQL|17 o superior|Persistencia relacional.
Servidor HTTPS|Certificado válido y proxy inverso recomendado|Protección del tráfico y publicación de /api/v1.
SMTP institucional|Cuenta autorizada por TI|Envío de credenciales.
'@ | ConvertFrom-Csv -Delimiter '|'

$environmentVariables = @'
Variable|Finalidad|Tratamiento
PORT|Puerto de la API NestJS.|Configurable; valor de referencia 3000.
NODE_ENV|Distingue desarrollo y producción.|production activa el modo operativo esperado.
DATABASE_URL|Cadena de conexión PostgreSQL.|Secreto; nunca versionar.
JWT_SECRET|Firma de tokens administrativos y electorales.|Secreto largo, aleatorio y rotado por el responsable.
JWT_EXPIRATION|Vigencia de sesión administrativa.|Definir según política institucional.
JWT_RESET_EXPIRATION|Vigencia del token de restablecimiento.|Valor corto; ejemplo 15m.
MAIL_MODE|preview para pruebas o smtp para producción.|En producción debe ser smtp.
SMTP_HOST/PORT/SECURE|Servidor y transporte de correo.|Configuración del proveedor institucional.
SMTP_USER/SMTP_PASS|Cuenta y contraseña de aplicación.|Secretos; acceso restringido.
SMTP_FROM|Remitente visible de credenciales.|Dirección institucional.
PUBLIC_APP_URL|Enlace público incluido en el correo.|Usar dominio HTTPS oficial.
'@ | ConvertFrom-Csv -Delimiter '|'

$traceability = @'
Objetivo específico|Requisitos relacionados|Evidencia en el producto|Sección de validación
Recopilar requisitos funcionales y no funcionales.|RF-01 a RF-30; RNF-01 a RNF-15.|Controladores, servicios, DTO, esquema Prisma y rutas Angular.|2.1 y matrices de 3.2.
Seleccionar y justificar el stack tecnológico.|RNF-06, RNF-10, RNF-11, RNF-14 y RNF-15.|Angular 22, NestJS 11, Prisma 7, PostgreSQL y monorepo pnpm.|2.2, 3.1 y bibliografía oficial.
Diseñar arquitectura y base de datos.|Todos los RF; RNF-06 a RNF-09 y RNF-14.|Arquitectura por capas, 25 modelos, relaciones e índices.|2.2 y 2.3.
Construir la plataforma web.|RF-01 a RF-30.|12 grupos de endpoints, 92 operaciones HTTP y módulos frontend.|3.1.
Ejecutar un plan de pruebas funcionales.|RF-01 a RF-30; RNF-01 a RNF-15.|30 casos funcionales, 10 casos de seguridad y 8 escenarios UAT.|3.2.
'@ | ConvertFrom-Csv -Delimiter '|'

$references = @(
    'Angular. (s. f.-a). Anatomy of a component. Recuperado el 27 de julio de 2026, de https://angular.dev/guide/components',
    'Angular. (s. f.-b). Interceptors. Recuperado el 27 de julio de 2026, de https://angular.dev/guide/http/interceptors',
    'International Organization for Standardization. (2023). ISO/IEC 25010:2023: Systems and software engineering—Systems and software Quality Requirements and Evaluation (SQuaRE)—Product quality model. https://www.iso.org/standard/78176.html',
    'International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2018). ISO/IEC/IEEE 29148:2018: Systems and software engineering—Life cycle processes—Requirements engineering. https://www.iso.org/standard/72089.html',
    'International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers. (2021). ISO/IEC/IEEE 29119-2:2021: Software and systems engineering—Software testing—Part 2: Test processes. https://www.iso.org/standard/79428.html',
    'Jones, M., Bradley, J., & Sakimura, N. (2015). JSON Web Token (JWT) (RFC 7519). RFC Editor. https://www.rfc-editor.org/rfc/rfc7519',
    'NestJS. (s. f.-a). Guards. Recuperado el 27 de julio de 2026, de https://docs.nestjs.com/guards',
    'NestJS. (s. f.-b). Modules. Recuperado el 27 de julio de 2026, de https://docs.nestjs.com/modules',
    'NestJS. (s. f.-c). Validation. Recuperado el 27 de julio de 2026, de https://docs.nestjs.com/techniques/validation',
    'OWASP Foundation. (2025a). OWASP Application Security Verification Standard 5.0.0. https://owasp.org/www-project-application-security-verification-standard/',
    'OWASP Foundation. (2025b). OWASP Top 10:2025. https://owasp.org/Top10/',
    'OWASP Foundation. (s. f.). Password storage cheat sheet. Recuperado el 27 de julio de 2026, de https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
    'PostgreSQL Global Development Group. (s. f.-a). Constraints. Recuperado el 27 de julio de 2026, de https://www.postgresql.org/docs/current/ddl-constraints.html',
    'PostgreSQL Global Development Group. (s. f.-b). Transactions. Recuperado el 27 de julio de 2026, de https://www.postgresql.org/docs/current/tutorial-transactions.html',
    'Prisma Data, Inc. (s. f.-a). Prisma ORM. Recuperado el 27 de julio de 2026, de https://www.prisma.io/docs/orm',
    'Prisma Data, Inc. (s. f.-b). Transactions and batch queries. Recuperado el 27 de julio de 2026, de https://www.prisma.io/docs/orm/prisma-client/queries/transactions',
    'Schwaber, K., & Sutherland, J. (2020). La Guía de Scrum: La guía definitiva de Scrum. https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Spanish-Latin-South-American.pdf',
    'Wiggins, A. (s. f.). Config. The Twelve-Factor App. Recuperado el 27 de julio de 2026, de https://12factor.net/config',
    'World Wide Web Consortium. (2024). Web Content Accessibility Guidelines (WCAG) 2.2. https://www.w3.org/TR/WCAG22/'
)

$script:word = $null
$script:doc = $null
$script:selection = $null

try {
    $script:checkpoint = 'abrir Word'
    [System.IO.File]::WriteAllText($diagnosticFile, '', [System.Text.UTF8Encoding]::new($true))
    $script:word = New-Object -ComObject Word.Application
    $script:word.Visible = $false
    $script:word.DisplayAlerts = 0
    $script:doc = $script:word.Documents.Open($inputFile, $false, $false)
    $script:doc.TrackRevisions = $false
    $script:doc.SaveAs2($outputFile, 16)

    $bodySampleRange = Find-TextRange -Document $script:doc -Text 'El desarrollo de una plataforma web de votación electrónica requiere una base conceptual sólida'
    $chapter2Range = Find-TextRange -Document $script:doc -Text 'CAPÍTULO II' -EndAt $bodySampleRange.Start -Forward $false
    $chapter2TitleRange = Find-TextRange -Document $script:doc -Text '2. MARCO TEÓRICO Y METODOLÓGICO' -StartAt $chapter2Range.End -EndAt $bodySampleRange.Start
    $chapter2SectionRange = Find-TextRange -Document $script:doc -Text '2.1. Fundamentación Teórica' -StartAt $chapter2Range.End -EndAt $bodySampleRange.Start
    $chapter2SubsectionRange = Find-TextRange -Document $script:doc -Text '2.1.1. Votación Electrónica' -StartAt $bodySampleRange.End
    $bibliographyRange = Find-TextRange -Document $script:doc -Text 'BIBLIOGRAFÍA' -StartAt $bodySampleRange.End

    $script:styleH1 = $chapter2Range.Paragraphs.Item(1).Range.Style
    $script:styleH2 = $chapter2TitleRange.Paragraphs.Item(1).Range.Style
    $script:styleH3 = $chapter2SectionRange.Paragraphs.Item(1).Range.Style
    $script:styleH4 = $chapter2SubsectionRange.Paragraphs.Item(1).Range.Style
    $script:styleBody = $bodySampleRange.Paragraphs.Item(1).Range.Style

    $replaceStart = $chapter2Range.Start
    $replaceEnd = $bibliographyRange.Start
    $script:doc.Range($replaceStart, $replaceEnd).Delete()
    $script:selection = $script:word.Selection
    $script:selection.SetRange($replaceStart, $replaceStart)

    $script:checkpoint = 'insertar capítulo II'
    Add-Heading -Text 'CAPÍTULO II' -Level 1
    Add-Heading -Text 'INGENIERÍA DE REQUISITOS Y DISEÑO DEL SISTEMA' -Level 2
    Add-Paragraph -Text 'Este capítulo transforma la necesidad institucional en especificaciones verificables y en un diseño técnico coherente con la plataforma construida. La ingeniería de requisitos se organizó tomando como referencia ISO/IEC/IEEE 29148:2018, norma que establece procesos y contenidos para definir, documentar y gestionar requisitos durante el ciclo de vida del software. En consecuencia, cada función se expresa con actor, prioridad y criterio de aceptación, y se relaciona con los componentes reales del frontend, la API y la base de datos (International Organization for Standardization, International Electrotechnical Commission, & Institute of Electrical and Electronics Engineers [ISO/IEC/IEEE], 2018).' -Style $script:styleBody
    Add-Paragraph -Text 'El diseño se fundamenta en el repositorio del proyecto: un monorepo administrado con pnpm y Turborepo, un cliente Angular 22, una API NestJS 11, Prisma ORM 7 y PostgreSQL. La especificación no incorpora servicios inexistentes. Por ello, la arquitectura de despliegue se presenta como una configuración reproducible para entorno institucional y no como evidencia de un hosting o una contenerización que todavía no constan en el código fuente.' -Style $script:styleBody

    Add-Heading -Text '2.1. Levantamiento de Requerimientos' -Level 3
    Add-Heading -Text '2.1.1. Criterio de levantamiento y alcance' -Level 4
    Add-Paragraph -Text 'El levantamiento se consolidó a partir del flujo electoral institucional descrito en la introducción y de la revisión del producto implementado. Se identificaron cuatro perspectivas: administración del proceso, participación del elector, consulta pública y operación técnica. La redacción evita expresiones ambiguas como “ser rápido” o “ser seguro”; en su lugar, establece conductas observables, reglas de negocio y mecanismos de verificación. Este tratamiento coincide con ISO/IEC/IEEE 29148:2018, que orienta a producir requisitos analizables y vinculados con los elementos posteriores de diseño y validación (ISO/IEC/IEEE, 2018).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 1. Actores y responsabilidades del sistema'
    Add-Table -Rows $actors
    Add-Source -Text 'Nota. Elaboración propia a partir de los módulos y rutas del sistema.'

    Add-Heading -Text '2.1.2. Requerimientos funcionales' -Level 4
    Add-Paragraph -Text 'Los requerimientos funcionales describen lo que la plataforma debe ejecutar. La tabla siguiente cubre la seguridad administrativa, la preparación de la elección, la jornada, la emisión del voto y el escrutinio. La prioridad alta corresponde a una condición necesaria para que el proceso sea válido; la prioridad media identifica una función complementaria de información, configuración o experiencia de usuario.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 2. Catálogo de requerimientos funcionales'
    Add-Table -Rows $functionalRequirements
    Add-Source -Text 'Nota. Elaboración propia con base en 92 operaciones HTTP y los servicios de dominio implementados.'

    Add-Heading -Text '2.1.3. Historias de usuario y criterios de aceptación' -Level 4
    Add-Paragraph -Text 'Las historias de usuario sintetizan objetivos de uso sin sustituir el catálogo formal. Se seleccionaron los recorridos que concentran mayor riesgo electoral. Los criterios de aceptación son concretos y sirven como origen de los casos de prueba del Capítulo III.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 3. Historias de usuario priorizadas'
    Add-Table -Rows $userStories
    Add-Source -Text 'Nota. Elaboración propia. La priorización sigue el valor operativo del proceso electoral.'

    Add-Heading -Text '2.1.4. Requerimientos no funcionales' -Level 4
    Add-Paragraph -Text 'La calidad se especificó como parte del producto y no como una declaración general. ISO/IEC 25010:2023 propone un modelo de nueve características para especificar y evaluar productos de software; para esta plataforma se priorizaron seguridad, fiabilidad, usabilidad, compatibilidad, mantenibilidad y portabilidad. Los controles de aplicación web también se contrastaron con OWASP ASVS 5.0.0, que ofrece requisitos verificables para autenticación, sesión, autorización y validación (International Organization for Standardization, 2023; OWASP Foundation, 2025a).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 4. Requerimientos no funcionales y mecanismo de verificación'
    Add-Table -Rows $nonFunctionalRequirements
    Add-Source -Text 'Nota. Elaboración propia con referencia a ISO/IEC 25010:2023, OWASP ASVS 5.0.0 y WCAG 2.2.'

    Add-Heading -Text '2.1.5. Reglas de negocio electoral' -Level 4
    Add-Paragraph -Text 'Las reglas de negocio delimitan decisiones que no deben depender únicamente de la interfaz. Por ello se aplican en los servicios NestJS y, cuando corresponde, se refuerzan mediante restricciones de PostgreSQL. Esta doble protección reduce la posibilidad de que una petición directa a la API omita una validación visual.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 5. Reglas de negocio principales'
    Add-Table -Rows $businessRules
    Add-Source -Text 'Nota. Elaboración propia a partir de JornadaService, VotacionService, EscrutinioService y schema.prisma.'

    Add-Heading -Text '2.1.6. Trazabilidad inicial' -Level 4
    Add-Paragraph -Text 'La trazabilidad relaciona los objetivos específicos con requisitos, módulos y futuras evidencias. Su propósito es evitar que una función aparezca aislada de la necesidad que la originó o que un objetivo quede sin implementación verificable.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 6. Matriz de trazabilidad de objetivos'
    Add-Table -Rows $traceability
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Heading -Text '2.2. Diseño de la Arquitectura del Sistema' -Level 3
    Add-Heading -Text '2.2.1. Estilo arquitectónico' -Level 4
    Add-Paragraph -Text 'La solución adopta una arquitectura cliente-servidor con separación por capas. Angular se encarga de la presentación y el estado de la interfaz; NestJS expone una API REST versionada y organiza el dominio en módulos; Prisma ORM traduce las operaciones tipadas hacia PostgreSQL. NestJS define los módulos como unidades que agrupan controladores y proveedores, lo cual favorece una frontera explícita para autenticación, elecciones, padrones, candidaturas, votación, jornada y escrutinio (NestJS, s. f.-b).' -Style $script:styleBody
    Add-Caption -Text 'Figura 1. Diagrama de bloques de la arquitectura lógica'
    Add-BlockDiagram -Blocks @('Usuarios', 'Angular 22', 'API REST /api/v1', 'NestJS 11', 'Prisma ORM 7', 'PostgreSQL 17+')
    Add-Source -Text 'Nota. Elaboración propia a partir de la estructura del monorepo.'

    Add-Paragraph -Text 'La comunicación del cliente se centraliza mediante HttpClient. El interceptor administrativo antepone la URL base, adjunta Authorization: Bearer cuando existe un token y limpia la sesión frente a una respuesta 401. La documentación oficial de Angular explica que los interceptores permiten abstraer autenticación, registro, reintentos y otras funciones transversales de cada petición individual (Angular, s. f.-b). En el servidor, los controladores reciben la petición, los DTO y ValidationPipe validan su forma, los guardas autorizan al actor y los servicios aplican las reglas antes de persistir.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 7. Componentes de la arquitectura'
    Add-Table -Rows $architectureComponents
    Add-Source -Text 'Nota. Elaboración propia con base en package.json, app.module.ts y los servicios del proyecto.'

    Add-Heading -Text '2.2.2. Organización de la API REST' -Level 4
    Add-Paragraph -Text 'La API utiliza el prefijo /api, versionamiento por URI con versión 1 y respuestas JSON. Los módulos no son microservicios independientes: forman una aplicación NestJS modular, comparten PrismaService y se despliegan como un solo backend. Esta precisión evita atribuir al sistema una complejidad operativa que no posee.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 8. Módulos y operaciones representativas de la API'
    Add-Table -Rows $apiModules
    Add-Source -Text 'Nota. Elaboración propia a partir de los doce controladores disponibles.'

    Add-Heading -Text '2.2.3. Arquitectura de seguridad' -Level 4
    Add-Paragraph -Text 'El sistema separa dos mecanismos de acceso. El personal administrativo usa una cuenta Usuario, contraseña bcrypt, JWT y autorización por rol/perfil. El elector no se convierte en usuario administrativo: recibe una credencial temporal asociada a PadronElectoral; al autenticarla obtiene un token limitado a la elección y a su identidad de padrón. El RFC 7519 define JWT como un formato compacto y seguro para URL que representa claims y puede protegerse mediante firma o MAC; en esta solución se emplea para transportar identidad, rol o alcance y tiempo de expiración (Jones et al., 2015).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 9. Controles de seguridad implementados'
    Add-Table -Rows $securityControls
    Add-Source -Text 'Nota. Elaboración propia. Los controles se contrastan con OWASP ASVS 5.0.0 y OWASP Top 10:2025.'

    Add-Paragraph -Text 'OWASP Top 10:2025 mantiene entre los riesgos principales el control de acceso roto, la configuración insegura, las fallas criptográficas, la inyección y las fallas de autenticación. La plataforma reduce estos riesgos mediante guardas, DTO estrictos, hashes, tokens con expiración, variables de entorno y auditoría. Estas medidas disminuyen la exposición, pero no sustituyen una prueba de penetración; por ello, dicha evaluación se conserva como actividad recomendada antes de la publicación institucional (OWASP Foundation, 2025b).' -Style $script:styleBody

    Add-Heading -Text '2.2.4. Flujo de emisión del voto' -Level 4
    Add-Paragraph -Text 'El flujo de voto concentra la principal regla de integridad. Primero se verifica que la elección esté abierta y que el enlace permanezca activo. Después se valida el padrón publicado, el estado HABILITADO, la versión y el hash de la credencial. El tarjetón se construye con dignidades aplicables y candidaturas calificadas. Al confirmar, una transacción registra una constancia VotoEmitido por dignidad, incrementa ConteoVoto para la opción elegida y revoca la credencial. Prisma documenta que una transacción agrupa operaciones que deben aprobarse o fallar como una unidad, propiedad necesaria para impedir resultados parciales (Prisma Data, Inc., s. f.-b).' -Style $script:styleBody
    Add-Caption -Text 'Figura 2. Secuencia lógica de la emisión'
    Add-BlockDiagram -Blocks @('Validar jornada', 'Autenticar elector', 'Construir tarjetón', 'Validar opciones', 'Transacción', 'Revocar credencial')
    Add-Source -Text 'Nota. Elaboración propia a partir de VotacionService.'

    Add-Heading -Text '2.3. Diseño de la Base de Datos' -Level 3
    Add-Heading -Text '2.3.1. Criterio del modelo relacional' -Level 4
    Add-Paragraph -Text 'PostgreSQL fue seleccionado porque el proceso exige relaciones explícitas, restricciones de unicidad y operaciones transaccionales. La documentación de PostgreSQL indica que una transacción trata varios pasos como una sola operación y que las claves primarias, foráneas y únicas permiten controlar la validez de los datos relacionados (PostgreSQL Global Development Group, s. f.-a, s. f.-b). Prisma ORM complementa este modelo mediante un esquema declarativo, cliente tipado y migraciones versionadas (Prisma Data, Inc., s. f.-a).' -Style $script:styleBody
    Add-Paragraph -Text 'El esquema contiene veinticinco modelos. Los identificadores principales son UUID, excepto la auditoría secuencial. Las relaciones emplean eliminación en cascada únicamente cuando el dato depende del expediente electoral; los registros que representan personas utilizan restricciones más conservadoras. Los índices se ubican en estados, fechas y claves foráneas consultadas con frecuencia.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 10. Agrupación de entidades y relaciones'
    Add-Table -Rows $entityGroups
    Add-Source -Text 'Nota. Elaboración propia a partir de apps/api/prisma/schema.prisma.'

    Add-Heading -Text '2.3.2. Esquema lógico de relaciones' -Level 4
    Add-Caption -Text 'Figura 3. Esquema entidad-relación simplificado'
    Add-BlockDiagram -Blocks @('Eleccion', 'Padrón / Elector', 'Dignidad / Candidatura', 'VotoEmitido + ConteoVoto', 'Acta / Impugnación')
    Add-Source -Text 'Nota. Elaboración propia. Las entidades de seguridad, configuración, cronograma, jornada y auditoría complementan el flujo principal.'
    Add-Paragraph -Text 'Eleccion es la raíz del dominio. ConfiguracionEleccion, CronogramaElectoral y JornadaElectoral mantienen relaciones uno a uno. Dignidad, PadronElectoral, ListaElectoral, Candidatura, VotoEmitido, ConteoVoto, ActaEscrutinio e HistorialEstadoEleccion se relacionan uno a muchos con la elección. Elector pertenece a catálogos académicos y puede intervenir en varios padrones o candidaturas, siempre bajo restricciones compuestas que impiden duplicación dentro de un mismo proceso.' -Style $script:styleBody

    Add-Heading -Text '2.3.3. Separación entre identidad y preferencia' -Level 4
    Add-Paragraph -Text 'La confidencialidad se resuelve mediante una separación intencional. VotoEmitido registra que un elector participó en una dignidad, pero no contiene candidaturaId ni tipo de voto. ConteoVoto conserva la opción y su total acumulado, pero no contiene electorId. En consecuencia, el sistema puede impedir el doble voto y calcular participación sin crear una fila que relacione directamente a la persona con su preferencia. Esta separación debe conservarse en reportes, copias de seguridad y futuras modificaciones.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 11. Diccionario de datos críticos'
    Add-Table -Rows $criticalDictionary
    Add-Source -Text 'Nota. Elaboración propia a partir del esquema Prisma.'

    Add-Heading -Text '2.3.4. Integridad, concurrencia y migraciones' -Level 4
    Add-Paragraph -Text 'La verificación previa de doble voto mejora el mensaje al usuario, pero la garantía definitiva reside en la restricción única de PostgreSQL. Si dos solicitudes concurrentes superaran la comprobación inicial, solo una podría confirmar la combinación elección-dignidad-elector. La emisión se ejecuta en una transacción para que la constancia, el incremento del conteo y la revocación de la credencial conserven el mismo resultado. Las migraciones de Prisma mantienen la historia del esquema y permiten aplicar cambios de forma controlada entre ambientes.' -Style $script:styleBody

    Add-Heading -Text '2.4. Diseño de Interfaz de Usuario (UI/UX)' -Level 3
    Add-Heading -Text '2.4.1. Principios de interacción' -Level 4
    Add-Paragraph -Text 'La interfaz se organiza en dos contextos visuales: sitio público y panel administrativo. Angular utiliza componentes para separar comportamiento, plantilla y estilos, lo que facilita mantener pantallas independientes y reutilizar servicios (Angular, s. f.-a). El flujo electoral prioriza lenguaje directo, estados visibles, confirmación antes de acciones irreversibles y mensajes que explican cómo corregir un dato sin revelar información sensible.' -Style $script:styleBody
    Add-Paragraph -Text 'Como referencia de accesibilidad se adoptan criterios aplicables de WCAG 2.2 nivel AA: navegación mediante teclado, foco perceptible, etiquetas asociadas a controles, contraste, mensajes comprensibles y objetivos táctiles suficientes. WCAG 2.2 formula criterios verificables y no dependientes de una tecnología específica, por lo que puede emplearse como lista de revisión de las pantallas Angular (World Wide Web Consortium [W3C], 2024).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 12. Pantallas y validaciones de interfaz'
    Add-Table -Rows $uiScreens
    Add-Source -Text 'Nota. Elaboración propia a partir de las rutas y componentes Angular.'

    Add-Heading -Text '2.4.2. Wireframes funcionales' -Level 4
    Add-Caption -Text 'Figura 4. Wireframe del portal público'
    Add-Wireframe -Title 'PORTAL PÚBLICO — IDENTIDAD INSTITUCIONAL Y ESTADO DE LA ELECCIÓN' -Sections @(
        'Navegación: Inicio | Actividades | Candidatos | Votar | Participación | Resultados | Instructivo',
        'Bloque principal: nombre de elección, mensaje de bienvenida, estado y fecha relevante',
        'Acciones contextuales: votar solo si la jornada está abierta; resultados solo si están disponibles',
        'Pie: institución, información de soporte y fuentes oficiales'
    )
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Caption -Text 'Figura 5. Wireframe del acceso y tarjetón del elector'
    Add-Wireframe -Title 'VOTACIÓN — ACCESO INDIVIDUAL Y TARJETÓN' -Sections @(
        'Acceso: identificación + credencial temporal + mensaje de vigencia',
        'Dignidad 1: candidatura(s) | voto en blanco | voto nulo',
        'Dignidad 2: candidatura(s) | voto en blanco | voto nulo',
        'Resumen de selecciones y advertencia de confirmación irreversible',
        'Acción final: Confirmar voto | Cancelar y revisar'
    )
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Caption -Text 'Figura 6. Wireframe del panel administrativo'
    Add-Wireframe -Title 'PANEL ADMINISTRATIVO — CONTROL DEL PROCESO' -Sections @(
        'Cabecera: usuario, perfil y cierre de sesión',
        'Menú autorizado: Seguridad | Elecciones | Padrón | Candidaturas | Jornada | Escrutinio',
        'Resumen: elección activa, estado, padrón habilitado, credenciales, participación y alertas',
        'Área de trabajo: tablas paginadas, formularios validados y confirmaciones',
        'Registro de resultado: mensaje de éxito o error sin datos técnicos sensibles'
    )
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Heading -Text '2.4.3. Navegación, retroalimentación y consistencia' -Level 4
    Add-Paragraph -Text 'Las rutas públicas permanecen separadas de /admin. En el panel, authGuard exige sesión, roleGuard restringe el rol y optionGuard contrasta la ruta con las opciones del perfil. Los servicios concentran las llamadas HTTP y los componentes presentan estados de carga, éxito o error. Para acciones críticas —publicar padrón, abrir o cerrar votación, aprobar actas y publicar definitivos— la interfaz debe solicitar confirmación y mostrar la consecuencia de la operación.' -Style $script:styleBody
    Add-Paragraph -Text 'Con lo anterior, el capítulo cumple los cuatro bloques de la guía: levantamiento de requisitos, arquitectura, base de datos y UI/UX. La especificación también establece una línea base para las pruebas del capítulo siguiente y para cualquier cambio futuro del sistema.' -Style $script:styleBody

    $script:checkpoint = 'guardar capítulo II'
    $script:doc.Save()
    $script:checkpoint = 'insertar capítulo III'
    Add-Heading -Text 'CAPÍTULO III' -Level 1
    Add-Heading -Text 'IMPLEMENTACIÓN, PRUEBAS Y RESULTADOS' -Level 2
    Add-Paragraph -Text 'Este capítulo describe cómo el diseño se convirtió en un producto de software y cómo se preparó su validación. La exposición se concentra en estructura, reglas de negocio, seguridad, persistencia, pruebas y despliegue; no reproduce fragmentos extensos de código. Cuando existe evidencia directa en el repositorio se informa como “conforme por inspección”. Las actividades que requieren ejecución por usuarios o firma institucional se mantienen como pendientes de evidencia para no presentar resultados no realizados.' -Style $script:styleBody

    Add-Heading -Text '3.1. Implementación y Codificación' -Level 3
    Add-Heading -Text '3.1.1. Organización del código fuente' -Level 4
    Add-Paragraph -Text 'La solución se implementó como monorepo. El directorio apps/web contiene el cliente Angular y apps/api la API NestJS. pnpm administra dependencias y Turborepo coordina scripts comunes. Esta organización permite compartir una raíz de trabajo sin mezclar las responsabilidades de presentación y servidor.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 13. Estructura principal del repositorio'
    Add-Table -Rows $implementationStructure
    Add-Source -Text 'Nota. Elaboración propia a partir del repositorio.'

    Add-Heading -Text '3.1.2. Implementación del frontend' -Level 4
    Add-Paragraph -Text 'El frontend usa componentes standalone de Angular y carga diferida de rutas. El sitio público incluye inicio, actividades, candidatos, votar, participación, resultados e instructivo. El panel administrativo agrupa autenticación, perfil, usuarios, seguridad, auditoría, elecciones, padrón, candidaturas, jornada, votación y escrutinio. Los servicios encapsulan el acceso a la API y los modelos TypeScript tipan las respuestas.' -Style $script:styleBody
    Add-Paragraph -Text 'El interceptor HTTP añade /api/v1 a las rutas relativas, adjunta el JWT administrativo y gestiona la respuesta 401. El token se almacena en sessionStorage, no en localStorage; así se elimina al terminar la sesión de la pestaña. El menú se calcula a partir de la información retornada por el servidor y las guardas del router impiden acceder a rutas no autorizadas.' -Style $script:styleBody

    Add-Heading -Text '3.1.3. Implementación del backend' -Level 4
    Add-Paragraph -Text 'NestJS organiza el backend en módulos con controladores, servicios, DTO, guardas y decoradores. Los controladores exponen 92 operaciones HTTP agrupadas en doce áreas funcionales. Los servicios contienen las reglas y PrismaService concentra la conexión. ValidationPipe opera de manera global con whitelist, forbidNonWhitelisted y transform, por lo que elimina la aceptación silenciosa de campos no declarados. NestJS documenta que los guardas deciden si una petición puede continuar y que la validación mediante pipes protege el contrato de entrada (NestJS, s. f.-a, s. f.-c).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 14. Áreas funcionales implementadas'
    Add-Table -Rows $implementedModules
    Add-Source -Text 'Nota. Elaboración propia a partir de app.module.ts, controladores y servicios.'

    Add-Heading -Text '3.1.4. Lógica del ciclo electoral' -Level 4
    Add-Paragraph -Text 'La preparación comienza con Eleccion en estado BORRADOR. El administrador registra configuración, cronograma y dignidades; luego consolida electores y padrón. Las credenciales se generan únicamente para padrones habilitados y publicados. El módulo de correo admite preview para pruebas y SMTP para producción, conservando fecha de envío o mensaje de error.' -Style $script:styleBody
    Add-Paragraph -Text 'La fase de candidaturas administra listas y postulaciones. El sistema verifica que el elector y la dignidad pertenezcan al contexto de la elección y evita duplicados por restricción compuesta. La consulta pública filtra exclusivamente candidaturas CALIFICADA. Con ello, una candidatura rechazada, retirada o todavía inscrita no puede aparecer en el tarjetón.' -Style $script:styleBody
    Add-Paragraph -Text 'La jornada exige inicialización, puesta a cero, credenciales completas y apertura. Cada paso produce una marca temporal y un JornadaEvento. Al iniciar se actualiza el estado a VOTACION_ABIERTA y se habilita el enlace; al cerrar se cambia a VOTACION_CERRADA y se desactiva. La generación posterior permite resultados, actas, impugnaciones y publicación definitiva.' -Style $script:styleBody
    Add-Caption -Text 'Figura 7. Flujo implementado del ciclo electoral'
    Add-BlockDiagram -Blocks @('Configurar', 'Publicar padrón', 'Calificar', 'Puesta a cero', 'Votar', 'Escrutar', 'Publicar')
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Heading -Text '3.1.5. Implementación de la emisión transaccional' -Level 4
    Add-Paragraph -Text 'Después de autenticar la credencial, el token del votante incluye la elección, el elector y la versión de la credencial. Antes de mostrar o aceptar el tarjetón, el servidor vuelve a verificar el estado electoral y que no exista participación previa. Cada opción CANDIDATO se contrasta con la dignidad, elección y estado de la candidatura; BLANCO y NULO se normalizan mediante opcionKey.' -Style $script:styleBody
    Add-Paragraph -Text 'La transacción crea VotoEmitido para cada dignidad, ejecuta upsert sobre ConteoVoto e invalida la credencial. Si cualquier escritura falla, Prisma revierte la unidad. El diseño conserva la prueba de que la persona participó, pero no guarda en esa constancia la candidatura o el tipo elegido. El conteo agregado sí conserva la opción, sin elector. Esta es la principal decisión de privacidad del producto.' -Style $script:styleBody

    Add-Heading -Text '3.1.6. Mecanismos de seguridad aplicados' -Level 4
    Add-Paragraph -Text 'Las contraseñas administrativas y electorales usan bcrypt con costo 12. OWASP recomienda funciones especializadas de almacenamiento de contraseñas con salt y costo ajustable; bcrypt sigue siendo una alternativa válida cuando se configura con un factor apropiado y se limita la longitud de entrada (OWASP Foundation, s. f.). Los JWT se firman con JWT_SECRET y sus vigencias se definen mediante variables de entorno. La sesión administrativa y el token de restablecimiento emplean expiraciones separadas.' -Style $script:styleBody
    Add-Paragraph -Text 'La autorización se aplica tanto en Angular como en NestJS, pero la decisión de seguridad final corresponde al servidor. Los datos de entrada se validan antes de entrar a los servicios. Las operaciones relevantes registran auditoría o historial. DATABASE_URL, JWT_SECRET, SMTP_PASS y otras credenciales permanecen fuera del código. Estas medidas abordan controles de ASVS relativos a autenticación, sesión, acceso, validación y secretos (OWASP Foundation, 2025a).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 15. Correspondencia entre riesgo y control'
    Add-Table -Rows $securityControls
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Heading -Text '3.1.7. Persistencia y evolución del esquema' -Level 4
    Add-Paragraph -Text 'Prisma genera un cliente tipado desde schema.prisma y conserva migraciones SQL. Las tres migraciones presentes documentan la creación inicial, la incorporación de catálogos académicos/paralelo/jornada y el fortalecimiento de credenciales electorales. En producción debe utilizarse prisma migrate deploy para aplicar únicamente migraciones versionadas, después de realizar respaldo y comprobar DATABASE_URL.' -Style $script:styleBody

    Add-Heading -Text '3.2. Plan y Ejecución de Pruebas (Testing)' -Level 3
    Add-Heading -Text '3.2.1. Estrategia y alcance' -Level 4
    Add-Paragraph -Text 'ISO/IEC/IEEE 29119-2:2021 define procesos genéricos para gobernar, gestionar e implementar pruebas en cualquier modelo de ciclo de vida. Con base en esa orientación, el plan separa verificación funcional, controles negativos de seguridad y aceptación de usuario. Cada caso conserva requisito, acción, resultado esperado, evidencia disponible y estado (ISO/IEC/IEEE, 2021).' -Style $script:styleBody
    Add-Paragraph -Text 'La revisión realizada para este documento fue estática: se contrastaron rutas, DTO, servicios, transacciones y restricciones del esquema. Este método permite demostrar que el mecanismo existe, pero no reemplaza la ejecución con datos de prueba. Por honestidad académica, el estado “conforme por inspección” no se presenta como prueba dinámica aprobada. La columna podrá cambiar a “Aprobado” únicamente después de ejecutar el caso y adjuntar captura, registro o acta.' -Style $script:styleBody

    Add-Heading -Text '3.2.2. Casos de prueba funcionales' -Level 4
    Add-Caption -Text 'Tabla 16. Matriz de pruebas funcionales'
    Add-Table -Rows $functionalTests
    Add-Source -Text 'Nota. Elaboración propia. Estado sustentado por inspección del código; falta adjuntar evidencia de ejecución para declarar aprobación dinámica.'

    Add-Heading -Text '3.2.3. Casos negativos de seguridad e integridad' -Level 4
    Add-Paragraph -Text 'Los casos negativos buscan que la plataforma falle de forma controlada. Se concentran en autorización, validación, concurrencia y exposición anticipada de resultados, categorías acordes con OWASP Top 10:2025 y ASVS 5.0.0 (OWASP Foundation, 2025a, 2025b).' -Style $script:styleBody
    Add-Caption -Text 'Tabla 17. Pruebas de seguridad e integridad'
    Add-Table -Rows $securityTests
    Add-Source -Text 'Nota. Elaboración propia. “Mecanismo configurado” requiere ejecución posterior para registrar resultado y evidencia.'

    Add-Heading -Text '3.2.4. Pruebas de Aceptación de Usuario (UAT)' -Level 4
    Add-Paragraph -Text 'La aceptación debe ser realizada por representantes institucionales y electores de prueba. No se atribuye al Tribunal Electoral una conformidad que todavía no consta firmada. Se entrega el instrumento listo para ejecución; cada evaluador debe registrar fecha, resultado, observaciones y firma. La aceptación se considerará satisfactoria cuando los ocho escenarios sean aprobados, no existan defectos críticos abiertos y las observaciones menores cuenten con responsable y fecha de corrección.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 18. Instrumento de aceptación de usuario'
    Add-Table -Rows $uatScenarios
    Add-Source -Text 'Nota. Elaboración propia. Estado general: pendiente de ejecución y firma institucional.'

    Add-Heading -Text '3.2.5. Síntesis de resultados verificables' -Level 4
    $verificationSummary = @'
Indicador|Resultado verificable|Interpretación
Alcance de API|92 operaciones HTTP en 12 grupos de controladores.|Cobertura funcional de administración, votación pública y escrutinio.
Modelo de datos|25 modelos Prisma con relaciones, índices y restricciones.|Persistencia suficiente para el ciclo electoral completo.
Requisitos|30 funcionales y 15 no funcionales documentados.|Línea base trazable para validación.
Pruebas funcionales|30 casos vinculados con RF-01 a RF-30.|Plan completo; evidencia dinámica aún debe adjuntarse.
Pruebas de seguridad|10 casos negativos definidos.|Mecanismos presentes; ejecución pendiente.
Aceptación de usuario|8 escenarios UAT preparados.|Pendiente de usuarios y firma institucional.
'@ | ConvertFrom-Csv -Delimiter '|'
    Add-Caption -Text 'Tabla 19. Resultados de la revisión técnica'
    Add-Table -Rows $verificationSummary
    Add-Source -Text 'Nota. Elaboración propia a partir del repositorio y del presente plan.'

    Add-Paragraph -Text 'El resultado principal es la coherencia entre requisitos y construcción: las funciones descritas tienen un endpoint, servicio, pantalla o restricción identificable. La limitación actual no es la ausencia del sistema, sino la falta de evidencia formal de ejecución y aceptación en el documento original. Por tanto, antes de la defensa deben anexarse capturas o registros de los casos críticos y el acta UAT firmada.' -Style $script:styleBody

    Add-Heading -Text '3.3. Entorno de Despliegue (Deployment)' -Level 3
    Add-Heading -Text '3.3.1. Topología propuesta y requisitos' -Level 4
    Add-Paragraph -Text 'El repositorio soporta un despliegue web clásico: archivos compilados de Angular servidos por un servidor HTTPS; solicitudes /api/v1 dirigidas a la aplicación NestJS; conexión privada hacia PostgreSQL; y salida SMTP para credenciales. No existe Dockerfile ni docker-compose en el proyecto, por lo que no se declara contenerización. La portabilidad se apoya en scripts de compilación, migraciones y variables de entorno.' -Style $script:styleBody
    Add-Caption -Text 'Figura 8. Topología lógica de despliegue'
    Add-BlockDiagram -Blocks @('Navegador HTTPS', 'Servidor web Angular', 'API NestJS /api/v1', 'PostgreSQL', 'SMTP institucional')
    Add-Source -Text 'Nota. Elaboración propia. La figura representa la configuración objetivo y no acredita un proveedor contratado.'
    Add-Caption -Text 'Tabla 20. Requisitos del entorno'
    Add-Table -Rows $deploymentRequirements
    Add-Source -Text 'Nota. Elaboración propia a partir de README.md y package.json.'

    Add-Heading -Text '3.3.2. Configuración externa' -Level 4
    Add-Paragraph -Text 'La configuración se mantiene fuera del código. Twelve-Factor recomienda separar estrictamente configuración y aplicación mediante variables de entorno, criterio que evita publicar secretos y facilita utilizar valores distintos en desarrollo y producción (Wiggins, s. f.). El archivo .env.example contiene nombres y valores de referencia, pero las credenciales reales deben administrarse mediante el mecanismo seguro del servidor.' -Style $script:styleBody
    Add-Caption -Text 'Tabla 21. Variables de entorno'
    Add-Table -Rows $environmentVariables
    Add-Source -Text 'Nota. Elaboración propia a partir de apps/api/.env.example.'

    Add-Heading -Text '3.3.3. Procedimiento de puesta en marcha' -Level 4
    $deploymentSteps = @'
Paso|Acción|Comando o comprobación
1|Instalar Node.js, pnpm y PostgreSQL compatibles.|node --version; pnpm --version; conexión a PostgreSQL.
2|Clonar el repositorio e instalar dependencias desde la raíz.|pnpm install
3|Copiar .env.example a .env y asignar secretos reales.|Comprobar DATABASE_URL, JWT_SECRET, SMTP y PUBLIC_APP_URL.
4|Generar el cliente Prisma.|pnpm --filter api exec prisma generate
5|Aplicar migraciones versionadas en el ambiente objetivo.|pnpm --filter api exec prisma migrate deploy
6|Cargar datos iniciales únicamente cuando el procedimiento institucional lo autorice.|pnpm --filter api db:seed
7|Compilar API y cliente web.|pnpm build
8|Publicar la carpeta de Angular y ejecutar NestJS con NODE_ENV=production.|Servidor HTTPS + proceso administrado.
9|Verificar salud funcional con una elección y usuarios de prueba.|Login, padrón, candidatura, jornada, voto y resultados.
10|Configurar respaldo, monitoreo y rotación de secretos.|Prueba de restauración y registro de responsables.
'@ | ConvertFrom-Csv -Delimiter '|'
    Add-Caption -Text 'Tabla 22. Secuencia de despliegue'
    Add-Table -Rows $deploymentSteps
    Add-Source -Text 'Nota. Elaboración propia. Los comandos se basan en los scripts del monorepo.'

    Add-Heading -Text '3.3.4. Controles operativos de producción' -Level 4
    Add-Paragraph -Text 'El servidor debe forzar HTTPS, limitar CORS al dominio institucional, ejecutar la API con una cuenta sin privilegios, registrar errores sin incluir contraseñas o tokens y mantener PostgreSQL en una red no expuesta. JWT_SECRET y SMTP_PASS requieren rotación. Antes de una elección se debe comprobar hora del servidor, correo, respaldo, puesta a cero y capacidad disponible. Después del cierre se debe generar una copia de seguridad, conservar actas y restringir el acceso administrativo según el periodo de retención institucional.' -Style $script:styleBody
    Add-Paragraph -Text 'La base de datos necesita respaldos antes de migraciones y antes y después de cada jornada. El procedimiento de recuperación debe probarse en un ambiente separado. La disponibilidad no depende solo del código: requiere responsable operativo, monitoreo de espacio, registro de fallos de correo y un canal alternativo de soporte para el elector.' -Style $script:styleBody

    Add-Heading -Text '3.4. Cumplimiento de Objetivos y Resultados' -Level 3
    Add-Heading -Text '3.4.1. Correspondencia con los objetivos específicos' -Level 4
    Add-Caption -Text 'Tabla 23. Cumplimiento técnico de objetivos'
    Add-Table -Rows $traceability
    Add-Source -Text 'Nota. Elaboración propia.'

    Add-Heading -Text '3.4.2. Aportes y limitaciones' -Level 4
    Add-Paragraph -Text 'La plataforma integra en un mismo producto el padrón, las credenciales, la oferta electoral, la jornada, la emisión, la participación, el escrutinio y las impugnaciones. La estructura modular facilita ubicar cada responsabilidad y la separación VotoEmitido-ConteoVoto evita almacenar la preferencia junto con la identidad. Las restricciones compuestas y las transacciones aportan una protección adicional frente a duplicidad y estados incompletos.' -Style $script:styleBody
    Add-Paragraph -Text 'Las limitaciones que deben declararse son: ausencia de integración con el sistema académico, inexistencia de aplicación móvil nativa, falta de firma electrónica certificada, ausencia de infraestructura productiva acreditada en el repositorio y necesidad de ejecutar UAT, pruebas de carga y evaluación de seguridad antes de uso oficial. Estas limitaciones no contradicen el alcance; definen las condiciones para una adopción institucional responsable.' -Style $script:styleBody
    Add-Paragraph -Text 'En síntesis, el producto implementa el ciclo funcional previsto y dispone de una base técnica verificable. La validación final depende de completar las evidencias de ejecución y la aceptación institucional, actividades que deben conservarse como registros del proyecto y no reemplazarse por afirmaciones sin respaldo.' -Style $script:styleBody

    $script:checkpoint = 'guardar capítulo III'
    $script:doc.Save()
    $script:checkpoint = 'reemplazar bibliografía'
    $newBibliographyRange = Find-TextRange -Document $script:doc -Text 'BIBLIOGRAFÍA' -StartAt $script:selection.End
    $bibHeadingEnd = $newBibliographyRange.Paragraphs.Item(1).Range.End
    if ($bibHeadingEnd -lt $script:doc.Content.End) {
        $script:doc.Range($bibHeadingEnd, $script:doc.Content.End - 1).Delete()
    }
    $script:selection.SetRange($script:doc.Content.End - 1, $script:doc.Content.End - 1)
    foreach ($reference in $references) {
        $start = $script:selection.Start
        $script:selection.Style = $script:styleBody
        $script:selection.TypeText($reference)
        $end = $script:selection.End
        $referenceRange = $script:doc.Range($start, $end)
        $referenceRange.Font.Name = 'Arial'
        $referenceRange.Font.Size = 11
        $referenceRange.ParagraphFormat.Alignment = $wdAlignParagraphLeft
        $referenceRange.ParagraphFormat.LeftIndent = 0
        $referenceRange.ParagraphFormat.FirstLineIndent = 0
        $referenceRange.ParagraphFormat.LineSpacingRule = $wdLineSpaceOnePtFive
        $referenceRange.ParagraphFormat.SpaceAfter = 6
        $script:selection.TypeParagraph()
    }

    $script:checkpoint = 'guardar documento'
    $script:doc.Save()

    $report = @(
        "Documento: $outputFile",
        'Capítulo II: requisitos, arquitectura, base de datos y UI/UX completados.',
        'Capítulo III: implementación, pruebas, despliegue y resultados completados.',
        'Índice automático: debe actualizarse en Word con clic derecho > Actualizar toda la tabla, después de la revisión del autor.',
        'Contenido excluido por instrucción del autor: Tribunal, Aceptación Institucional, páginas de firma/aprobación y anexos.',
        'Evidencias pendientes declaradas sin fabricación: ejecución dinámica, UAT firmada y despliegue productivo.'
    ) -join [Environment]::NewLine
    [System.IO.File]::WriteAllText($reportFile, $report, [System.Text.UTF8Encoding]::new($true))
}
catch {
    $details = @(
        "Punto: $script:checkpoint",
        "Mensaje: $($_.Exception.Message)",
        "Línea: $($_.InvocationInfo.ScriptLineNumber)",
        "Código: $($_.InvocationInfo.Line)"
    ) -join [Environment]::NewLine
    [System.IO.File]::WriteAllText($diagnosticFile, $details, [System.Text.UTF8Encoding]::new($true))
    throw
}
finally {
    if ($script:doc) {
        $script:doc.Close($false)
    }
    if ($script:word) {
        $script:word.Quit()
    }
    if ($script:selection) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:selection) | Out-Null
    }
    if ($script:doc) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:doc) | Out-Null
    }
    if ($script:word) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
