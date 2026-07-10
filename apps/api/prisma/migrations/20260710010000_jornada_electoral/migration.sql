-- CreateEnum
CREATE TYPE "PasoJornada" AS ENUM ('INICIALIZACION', 'PUESTA_A_CERO', 'INICIO_VOTACION', 'CIERRE_VOTACION', 'RESULTADOS');

-- AlterTable
ALTER TABLE "electores" ADD COLUMN     "foto_url" TEXT;

-- AlterTable
ALTER TABLE "padrones_electorales" ADD COLUMN     "credencial_hash" VARCHAR(255),
ADD COLUMN     "credencial_temporal" VARCHAR(60),
ADD COLUMN     "credencial_generada_at" TIMESTAMP(3);

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

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_electorales_eleccion_id_key" ON "jornadas_electorales"("eleccion_id");

-- CreateIndex
CREATE INDEX "jornada_eventos_jornada_id_idx" ON "jornada_eventos"("jornada_id");

-- AddForeignKey
ALTER TABLE "jornadas_electorales" ADD CONSTRAINT "jornadas_electorales_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada_eventos" ADD CONSTRAINT "jornada_eventos_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas_electorales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
