-- AlterTable
ALTER TABLE "elecciones" ADD COLUMN     "portal_publico" BOOLEAN NOT NULL DEFAULT false;

-- Marca como "portal publico" la eleccion activa mas reciente (no borrador,
-- no anulada, no posesionada). Si no hay ninguna, el portal queda en blanco.
UPDATE "elecciones"
SET "portal_publico" = true
WHERE "id" = (
  SELECT "id" FROM "elecciones"
  WHERE "estado" NOT IN ('BORRADOR', 'ANULADA', 'POSESIONADA')
  ORDER BY "created_at" DESC
  LIMIT 1
);
