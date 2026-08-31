-- AlterTable
ALTER TABLE "cronogramas_electorales" ADD COLUMN     "orden_hitos" TEXT[] DEFAULT ARRAY[]::TEXT[];
