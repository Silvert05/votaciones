-- CreateTable
CREATE TABLE "lista_dignidad_estados" (
    "id" UUID NOT NULL,
    "lista_id" UUID NOT NULL,
    "dignidad_id" UUID NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lista_dignidad_estados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lista_dignidad_estados_lista_id_idx" ON "lista_dignidad_estados"("lista_id");

-- CreateIndex
CREATE INDEX "lista_dignidad_estados_dignidad_id_idx" ON "lista_dignidad_estados"("dignidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "lista_dignidad_estados_lista_id_dignidad_id_key" ON "lista_dignidad_estados"("lista_id", "dignidad_id");

-- AddForeignKey
ALTER TABLE "lista_dignidad_estados" ADD CONSTRAINT "lista_dignidad_estados_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas_electorales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_dignidad_estados" ADD CONSTRAINT "lista_dignidad_estados_dignidad_id_fkey" FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "conteos_votos_carrera_eleccion_dignidad_carrera_opcion_key" RENAME TO "conteos_votos_carrera_eleccion_id_dignidad_id_carrera_id_op_key";
