/*
  Warnings:

  - You are about to drop the column `fecha_convocatoria` on the `elecciones` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "elecciones_fecha_convocatoria_idx";

-- AlterTable
ALTER TABLE "candidaturas" ADD COLUMN     "porcentaje_aprobado_carrera" DECIMAL(5,2),
ADD COLUMN     "promedio_academico" DECIMAL(5,2),
ADD COLUMN     "sancionado" BOOLEAN;

-- AlterTable
ALTER TABLE "elecciones" DROP COLUMN "fecha_convocatoria";

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "encargado_cronograma" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cronograma_items" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cronograma_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cronograma_items_eleccion_id_idx" ON "cronograma_items"("eleccion_id");

-- AddForeignKey
ALTER TABLE "cronograma_items" ADD CONSTRAINT "cronograma_items_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
