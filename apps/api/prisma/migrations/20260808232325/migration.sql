/*
  Warnings:

  - A unique constraint covering the columns `[eleccion_id,dignidad_id,vuelta]` on the table `actas_escrutinio` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[elector_id]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- AlterEnum
ALTER TYPE "EstadoCandidatura" ADD VALUE 'OBSERVADA';

-- AlterEnum
ALTER TYPE "EstadoListaElectoral" ADD VALUE 'OBSERVADA';

-- DropIndex
DROP INDEX "actas_escrutinio_eleccion_id_dignidad_id_key";

-- AlterTable
ALTER TABLE "actas_escrutinio" ADD COLUMN     "empatado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "empate_candidatura_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vuelta" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "candidaturas" ADD COLUMN     "excluida_segunda_vuelta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plazo_subsanacion_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cronogramas_electorales" ADD COLUMN     "lugar_votacion" VARCHAR(255);

-- AlterTable
ALTER TABLE "dignidades" ADD COLUMN     "pausada_segunda_vuelta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vuelta" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "electores" ADD COLUMN     "genero" "Genero";

-- AlterTable
ALTER TABLE "impugnaciones_resultados" ADD COLUMN     "fecha_limite_resolucion" TIMESTAMP(3),
ADD COLUMN     "respaldo_identificaciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "respaldo_validos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "elector_id" UUID;

-- CreateTable
CREATE TABLE "impugnaciones_candidaturas" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "candidatura_id" UUID NOT NULL,
    "presentado_por" VARCHAR(160) NOT NULL,
    "correo_notificacion" VARCHAR(160) NOT NULL,
    "fundamento" TEXT NOT NULL,
    "estado" "EstadoImpugnacionResultado" NOT NULL DEFAULT 'PENDIENTE',
    "resolucion" TEXT,
    "fecha_presentacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impugnaciones_candidaturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impugnaciones_candidaturas_eleccion_id_idx" ON "impugnaciones_candidaturas"("eleccion_id");

-- CreateIndex
CREATE INDEX "impugnaciones_candidaturas_candidatura_id_idx" ON "impugnaciones_candidaturas"("candidatura_id");

-- CreateIndex
CREATE INDEX "impugnaciones_candidaturas_estado_idx" ON "impugnaciones_candidaturas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "actas_escrutinio_eleccion_id_dignidad_id_vuelta_key" ON "actas_escrutinio"("eleccion_id", "dignidad_id", "vuelta");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_elector_id_key" ON "usuarios"("elector_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_elector_id_fkey" FOREIGN KEY ("elector_id") REFERENCES "electores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impugnaciones_candidaturas" ADD CONSTRAINT "impugnaciones_candidaturas_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impugnaciones_candidaturas" ADD CONSTRAINT "impugnaciones_candidaturas_candidatura_id_fkey" FOREIGN KEY ("candidatura_id") REFERENCES "candidaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
