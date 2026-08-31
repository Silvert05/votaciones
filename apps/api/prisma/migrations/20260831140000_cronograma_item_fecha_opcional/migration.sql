-- AlterTable: la fecha de inicio de un ítem del cronograma pasa a ser opcional
-- (un ítem puede ser solo inicio, solo fin/fecha límite, o un rango).
ALTER TABLE "cronograma_items" ALTER COLUMN "fecha" DROP NOT NULL;
