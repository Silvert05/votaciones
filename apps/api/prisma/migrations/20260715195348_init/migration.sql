-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TipoOpcion" AS ENUM ('GRUPO', 'PANTALLA');

-- CreateEnum
CREATE TYPE "TipoEleccion" AS ENUM ('INSTITUCIONAL', 'CONSEJO_ESTUDIANTIL', 'PRESIDENTES_CURSO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoEleccion" AS ENUM ('BORRADOR', 'CONVOCADA', 'PADRON_PUBLICADO', 'CANDIDATURAS_ABIERTAS', 'CANDIDATURAS_CALIFICADAS', 'CAMPANIA', 'VOTACION_ABIERTA', 'VOTACION_CERRADA', 'ESCRUTINIO', 'RESULTADOS_PROVISIONALES', 'IMPUGNACION_RESULTADOS', 'RESULTADOS_DEFINITIVOS', 'POSESIONADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoElector" AS ENUM ('DOCENTE', 'ESTUDIANTE', 'AMBOS');

-- CreateEnum
CREATE TYPE "EstadoPadronElector" AS ENUM ('HABILITADO', 'INHABILITADO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "EstadoListaElectoral" AS ENUM ('BORRADOR', 'INSCRITA', 'CALIFICADA', 'RECHAZADA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "EstadoCandidatura" AS ENUM ('INSCRITA', 'CALIFICADA', 'RECHAZADA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "TipoVoto" AS ENUM ('CANDIDATO', 'BLANCO', 'NULO');

-- CreateEnum
CREATE TYPE "EstadoActaEscrutinio" AS ENUM ('BORRADOR', 'CERRADA', 'APROBADA');

-- CreateEnum
CREATE TYPE "EstadoImpugnacionResultado" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "PasoJornada" AS ENUM ('INICIALIZACION', 'PUESTA_A_CERO', 'INICIO_VOTACION', 'CIERRE_VOTACION', 'RESULTADOS');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "usuario" VARCHAR(150) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USER',
    "perfil_id" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "email" VARCHAR(150) NOT NULL,
    "cambiar_password" BOOLEAN NOT NULL DEFAULT false,
    "fecha_caducidad" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(120) NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "subtitulo" VARCHAR(180),
    "ruta" VARCHAR(180),
    "icono" VARCHAR(120),
    "tipo" "TipoOpcion" NOT NULL DEFAULT 'PANTALLA',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "padre_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_opciones" (
    "perfil_id" UUID NOT NULL,
    "opcion_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_opciones_pkey" PRIMARY KEY ("perfil_id","opcion_id")
);

-- CreateTable
CREATE TABLE "elecciones" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoEleccion" NOT NULL,
    "estado" "EstadoEleccion" NOT NULL DEFAULT 'BORRADOR',
    "fecha_convocatoria" TIMESTAMP(3),
    "vuelta_actual" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_eleccion" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "nombre_institucion" VARCHAR(200),
    "logo_url" TEXT,
    "escudo_url" TEXT,
    "video_url" TEXT,
    "color_primario" VARCHAR(20),
    "color_secundario" VARCHAR(20),
    "color_acento" VARCHAR(20),
    "mensaje_bienvenida" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_eleccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carreras" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carreras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveles" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niveles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electores" (
    "id" UUID NOT NULL,
    "identificacion" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180),
    "foto_url" TEXT,
    "tipo" "TipoElector" NOT NULL,
    "facultad" VARCHAR(160),
    "carrera_id" UUID,
    "nivel_id" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padrones_electorales" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "elector_id" UUID NOT NULL,
    "estado" "EstadoPadronElector" NOT NULL DEFAULT 'HABILITADO',
    "motivo" VARCHAR(255),
    "observacion" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_publicacion" TIMESTAMP(3),
    "credencial_hash" VARCHAR(255),
    "credencial_temporal" VARCHAR(60),
    "credencial_generada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "padrones_electorales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_electorales" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "color" VARCHAR(20),
    "descripcion" TEXT,
    "propuesta" TEXT,
    "estado" "EstadoListaElectoral" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listas_electorales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidaturas" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "dignidad_id" UUID NOT NULL,
    "elector_id" UUID NOT NULL,
    "lista_id" UUID,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoCandidatura" NOT NULL DEFAULT 'INSCRITA',
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dignidades" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "descripcion" TEXT,
    "tipo_elector_permitido" "TipoElector" NOT NULL DEFAULT 'AMBOS',
    "cantidad_ganadores" INTEGER NOT NULL DEFAULT 1,
    "requiere_lista" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dignidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos_emitidos" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "dignidad_id" UUID NOT NULL,
    "elector_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_emitidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteos_votos" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "dignidad_id" UUID NOT NULL,
    "candidatura_id" UUID,
    "tipo" "TipoVoto" NOT NULL,
    "opcion_key" VARCHAR(80) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conteos_votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actas_escrutinio" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "dignidad_id" UUID NOT NULL,
    "numero_acta" VARCHAR(40) NOT NULL,
    "total_padron" INTEGER NOT NULL DEFAULT 0,
    "total_votantes" INTEGER NOT NULL DEFAULT 0,
    "votos_validos" INTEGER NOT NULL DEFAULT 0,
    "votos_blancos" INTEGER NOT NULL DEFAULT 0,
    "votos_nulos" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoActaEscrutinio" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "cerrada_at" TIMESTAMP(3),
    "aprobada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actas_escrutinio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_acta_escrutinio" (
    "id" UUID NOT NULL,
    "acta_id" UUID NOT NULL,
    "candidatura_id" UUID,
    "tipo" "TipoVoto" NOT NULL,
    "opcion_key" VARCHAR(80) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detalles_acta_escrutinio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impugnaciones_resultados" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "dignidad_id" UUID,
    "acta_id" UUID,
    "presentado_por" VARCHAR(160) NOT NULL,
    "fundamento" TEXT NOT NULL,
    "estado" "EstadoImpugnacionResultado" NOT NULL DEFAULT 'PENDIENTE',
    "resolucion" TEXT,
    "fecha_presentacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impugnaciones_resultados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas_electorales" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "config_bloqueada" BOOLEAN NOT NULL DEFAULT false,
    "inicializada_at" TIMESTAMP(3),
    "puesta_cero_at" TIMESTAMP(3),
    "votacion_iniciada_at" TIMESTAMP(3),
    "votacion_cerrada_at" TIMESTAMP(3),
    "resultados_at" TIMESTAMP(3),
    "fecha_fin_votacion" TIMESTAMP(3),
    "link_votacion_activo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_electorales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornada_eventos" (
    "id" UUID NOT NULL,
    "jornada_id" UUID NOT NULL,
    "paso" "PasoJornada" NOT NULL,
    "reporte" TEXT,
    "usuario" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornada_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cronogramas_electorales" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "fecha_convocatoria" TIMESTAMP(3),
    "fecha_publicacion_padron" TIMESTAMP(3),
    "fecha_inicio_inscripcion" TIMESTAMP(3),
    "fecha_fin_inscripcion" TIMESTAMP(3),
    "fecha_inicio_impugnacion_candidaturas" TIMESTAMP(3),
    "fecha_fin_impugnacion_candidaturas" TIMESTAMP(3),
    "fecha_publicacion_candidaturas" TIMESTAMP(3),
    "fecha_inicio_campania" TIMESTAMP(3),
    "fecha_fin_campania" TIMESTAMP(3),
    "fecha_inicio_votacion" TIMESTAMP(3),
    "fecha_fin_votacion" TIMESTAMP(3),
    "fecha_publicacion_resultados" TIMESTAMP(3),
    "fecha_fin_impugnacion_resultados" TIMESTAMP(3),
    "fecha_resultados_finales" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cronogramas_electorales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados_eleccion" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "estado_anterior" "EstadoEleccion",
    "estado_nuevo" "EstadoEleccion" NOT NULL,
    "comentario" VARCHAR(255),
    "usuario" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_eleccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "tabla" VARCHAR(80) NOT NULL,
    "registro_id" UUID,
    "operacion" VARCHAR(10) NOT NULL,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "usuario" VARCHAR(100),
    "ip" INET,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "usuarios_usuario_idx" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "usuarios_perfil_id_idx" ON "usuarios"("perfil_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_nombre_key" ON "perfiles"("nombre");

-- CreateIndex
CREATE INDEX "perfiles_activo_idx" ON "perfiles"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_codigo_key" ON "opciones"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_ruta_key" ON "opciones"("ruta");

-- CreateIndex
CREATE INDEX "opciones_padre_id_idx" ON "opciones"("padre_id");

-- CreateIndex
CREATE INDEX "opciones_activo_idx" ON "opciones"("activo");

-- CreateIndex
CREATE INDEX "opciones_orden_idx" ON "opciones"("orden");

-- CreateIndex
CREATE INDEX "perfiles_opciones_opcion_id_idx" ON "perfiles_opciones"("opcion_id");

-- CreateIndex
CREATE INDEX "elecciones_estado_idx" ON "elecciones"("estado");

-- CreateIndex
CREATE INDEX "elecciones_tipo_idx" ON "elecciones"("tipo");

-- CreateIndex
CREATE INDEX "elecciones_fecha_convocatoria_idx" ON "elecciones"("fecha_convocatoria");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_eleccion_eleccion_id_key" ON "configuraciones_eleccion"("eleccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "carreras_nombre_key" ON "carreras"("nombre");

-- CreateIndex
CREATE INDEX "carreras_activo_orden_idx" ON "carreras"("activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "niveles_nombre_key" ON "niveles"("nombre");

-- CreateIndex
CREATE INDEX "niveles_activo_orden_idx" ON "niveles"("activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "electores_identificacion_key" ON "electores"("identificacion");

-- CreateIndex
CREATE INDEX "electores_tipo_idx" ON "electores"("tipo");

-- CreateIndex
CREATE INDEX "electores_activo_idx" ON "electores"("activo");

-- CreateIndex
CREATE INDEX "electores_carrera_id_idx" ON "electores"("carrera_id");

-- CreateIndex
CREATE INDEX "electores_nivel_id_idx" ON "electores"("nivel_id");

-- CreateIndex
CREATE INDEX "padrones_electorales_eleccion_id_idx" ON "padrones_electorales"("eleccion_id");

-- CreateIndex
CREATE INDEX "padrones_electorales_elector_id_idx" ON "padrones_electorales"("elector_id");

-- CreateIndex
CREATE INDEX "padrones_electorales_estado_idx" ON "padrones_electorales"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "padrones_electorales_eleccion_id_elector_id_key" ON "padrones_electorales"("eleccion_id", "elector_id");

-- CreateIndex
CREATE INDEX "listas_electorales_eleccion_id_idx" ON "listas_electorales"("eleccion_id");

-- CreateIndex
CREATE INDEX "listas_electorales_estado_idx" ON "listas_electorales"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "listas_electorales_eleccion_id_codigo_key" ON "listas_electorales"("eleccion_id", "codigo");

-- CreateIndex
CREATE INDEX "candidaturas_eleccion_id_idx" ON "candidaturas"("eleccion_id");

-- CreateIndex
CREATE INDEX "candidaturas_dignidad_id_idx" ON "candidaturas"("dignidad_id");

-- CreateIndex
CREATE INDEX "candidaturas_elector_id_idx" ON "candidaturas"("elector_id");

-- CreateIndex
CREATE INDEX "candidaturas_lista_id_idx" ON "candidaturas"("lista_id");

-- CreateIndex
CREATE INDEX "candidaturas_estado_idx" ON "candidaturas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "candidaturas_eleccion_id_dignidad_id_elector_id_key" ON "candidaturas"("eleccion_id", "dignidad_id", "elector_id");

-- CreateIndex
CREATE INDEX "dignidades_eleccion_id_idx" ON "dignidades"("eleccion_id");

-- CreateIndex
CREATE INDEX "dignidades_tipo_elector_permitido_idx" ON "dignidades"("tipo_elector_permitido");

-- CreateIndex
CREATE INDEX "votos_emitidos_eleccion_id_idx" ON "votos_emitidos"("eleccion_id");

-- CreateIndex
CREATE INDEX "votos_emitidos_dignidad_id_idx" ON "votos_emitidos"("dignidad_id");

-- CreateIndex
CREATE INDEX "votos_emitidos_elector_id_idx" ON "votos_emitidos"("elector_id");

-- CreateIndex
CREATE UNIQUE INDEX "votos_emitidos_eleccion_id_dignidad_id_elector_id_key" ON "votos_emitidos"("eleccion_id", "dignidad_id", "elector_id");

-- CreateIndex
CREATE INDEX "conteos_votos_eleccion_id_idx" ON "conteos_votos"("eleccion_id");

-- CreateIndex
CREATE INDEX "conteos_votos_dignidad_id_idx" ON "conteos_votos"("dignidad_id");

-- CreateIndex
CREATE INDEX "conteos_votos_candidatura_id_idx" ON "conteos_votos"("candidatura_id");

-- CreateIndex
CREATE UNIQUE INDEX "conteos_votos_eleccion_id_dignidad_id_opcion_key_key" ON "conteos_votos"("eleccion_id", "dignidad_id", "opcion_key");

-- CreateIndex
CREATE INDEX "actas_escrutinio_eleccion_id_idx" ON "actas_escrutinio"("eleccion_id");

-- CreateIndex
CREATE INDEX "actas_escrutinio_dignidad_id_idx" ON "actas_escrutinio"("dignidad_id");

-- CreateIndex
CREATE INDEX "actas_escrutinio_estado_idx" ON "actas_escrutinio"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "actas_escrutinio_eleccion_id_dignidad_id_key" ON "actas_escrutinio"("eleccion_id", "dignidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "actas_escrutinio_numero_acta_key" ON "actas_escrutinio"("numero_acta");

-- CreateIndex
CREATE INDEX "detalles_acta_escrutinio_acta_id_idx" ON "detalles_acta_escrutinio"("acta_id");

-- CreateIndex
CREATE INDEX "detalles_acta_escrutinio_candidatura_id_idx" ON "detalles_acta_escrutinio"("candidatura_id");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_acta_escrutinio_acta_id_opcion_key_key" ON "detalles_acta_escrutinio"("acta_id", "opcion_key");

-- CreateIndex
CREATE INDEX "impugnaciones_resultados_eleccion_id_idx" ON "impugnaciones_resultados"("eleccion_id");

-- CreateIndex
CREATE INDEX "impugnaciones_resultados_dignidad_id_idx" ON "impugnaciones_resultados"("dignidad_id");

-- CreateIndex
CREATE INDEX "impugnaciones_resultados_acta_id_idx" ON "impugnaciones_resultados"("acta_id");

-- CreateIndex
CREATE INDEX "impugnaciones_resultados_estado_idx" ON "impugnaciones_resultados"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_electorales_eleccion_id_key" ON "jornadas_electorales"("eleccion_id");

-- CreateIndex
CREATE INDEX "jornada_eventos_jornada_id_idx" ON "jornada_eventos"("jornada_id");

-- CreateIndex
CREATE UNIQUE INDEX "cronogramas_electorales_eleccion_id_key" ON "cronogramas_electorales"("eleccion_id");

-- CreateIndex
CREATE INDEX "historial_estados_eleccion_eleccion_id_created_at_idx" ON "historial_estados_eleccion"("eleccion_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auditoria_tabla_created_at_idx" ON "auditoria"("tabla", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auditoria_registro_id_idx" ON "auditoria"("registro_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones" ADD CONSTRAINT "opciones_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "opciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_opciones" ADD CONSTRAINT "perfiles_opciones_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_opciones" ADD CONSTRAINT "perfiles_opciones_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "opciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_eleccion" ADD CONSTRAINT "configuraciones_eleccion_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electores" ADD CONSTRAINT "electores_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "carreras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electores" ADD CONSTRAINT "electores_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "padrones_electorales" ADD CONSTRAINT "padrones_electorales_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "padrones_electorales" ADD CONSTRAINT "padrones_electorales_elector_id_fkey" FOREIGN KEY ("elector_id") REFERENCES "electores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_electorales" ADD CONSTRAINT "listas_electorales_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_dignidad_id_fkey" FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_elector_id_fkey" FOREIGN KEY ("elector_id") REFERENCES "electores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas_electorales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dignidades" ADD CONSTRAINT "dignidades_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_emitidos" ADD CONSTRAINT "votos_emitidos_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_emitidos" ADD CONSTRAINT "votos_emitidos_dignidad_id_fkey" FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_emitidos" ADD CONSTRAINT "votos_emitidos_elector_id_fkey" FOREIGN KEY ("elector_id") REFERENCES "electores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteos_votos" ADD CONSTRAINT "conteos_votos_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteos_votos" ADD CONSTRAINT "conteos_votos_dignidad_id_fkey" FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteos_votos" ADD CONSTRAINT "conteos_votos_candidatura_id_fkey" FOREIGN KEY ("candidatura_id") REFERENCES "candidaturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actas_escrutinio" ADD CONSTRAINT "actas_escrutinio_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actas_escrutinio" ADD CONSTRAINT "actas_escrutinio_dignidad_id_fkey" FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_acta_escrutinio" ADD CONSTRAINT "detalles_acta_escrutinio_acta_id_fkey" FOREIGN KEY ("acta_id") REFERENCES "actas_escrutinio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_acta_escrutinio" ADD CONSTRAINT "detalles_acta_escrutinio_candidatura_id_fkey" FOREIGN KEY ("candidatura_id") REFERENCES "candidaturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impugnaciones_resultados" ADD CONSTRAINT "impugnaciones_resultados_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impugnaciones_resultados" ADD CONSTRAINT "impugnaciones_resultados_dignidad_id_fkey" FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impugnaciones_resultados" ADD CONSTRAINT "impugnaciones_resultados_acta_id_fkey" FOREIGN KEY ("acta_id") REFERENCES "actas_escrutinio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_electorales" ADD CONSTRAINT "jornadas_electorales_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada_eventos" ADD CONSTRAINT "jornada_eventos_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas_electorales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas_electorales" ADD CONSTRAINT "cronogramas_electorales_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_eleccion" ADD CONSTRAINT "historial_estados_eleccion_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
