/*
  Warnings:

  - You are about to drop the column `porcentaje_aprobado_carrera` on the `candidaturas` table. All the data in the column will be lost.
  - You are about to drop the column `promedio_academico` on the `candidaturas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidaturas" DROP COLUMN "porcentaje_aprobado_carrera",
DROP COLUMN "promedio_academico",
ADD COLUMN     "cumple_aprobado_carrera" BOOLEAN,
ADD COLUMN     "cumple_promedio_academico" BOOLEAN;
