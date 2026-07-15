-- AlterTable
ALTER TABLE "electores" ADD COLUMN     "jornada_id" UUID,
ADD COLUMN     "paralelo_id" UUID;

-- CreateTable
CREATE TABLE "paralelos" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(10) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paralelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paralelos_nombre_key" ON "paralelos"("nombre");

-- CreateIndex
CREATE INDEX "paralelos_activo_orden_idx" ON "paralelos"("activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_nombre_key" ON "jornadas"("nombre");

-- CreateIndex
CREATE INDEX "jornadas_activo_orden_idx" ON "jornadas"("activo", "orden");

-- CreateIndex
CREATE INDEX "electores_paralelo_id_idx" ON "electores"("paralelo_id");

-- CreateIndex
CREATE INDEX "electores_jornada_id_idx" ON "electores"("jornada_id");

-- AddForeignKey
ALTER TABLE "electores" ADD CONSTRAINT "electores_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electores" ADD CONSTRAINT "electores_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
