-- AlterTable
ALTER TABLE "cronogramas_electorales" ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT false;

-- Los cronogramas que ya existian se mantienen visibles en el portal.
UPDATE "cronogramas_electorales" SET "publicado" = true;
