-- Estadisticas agregadas por carrera sin almacenar la seleccion individual.
CREATE TABLE "conteos_votos_carrera" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "dignidad_id" UUID NOT NULL,
    "carrera_id" UUID NOT NULL,
    "candidatura_id" UUID,
    "tipo" "TipoVoto" NOT NULL,
    "opcion_key" VARCHAR(80) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conteos_votos_carrera_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conteos_votos_carrera_eleccion_dignidad_carrera_opcion_key"
    ON "conteos_votos_carrera"("eleccion_id", "dignidad_id", "carrera_id", "opcion_key");
CREATE INDEX "conteos_votos_carrera_eleccion_id_idx"
    ON "conteos_votos_carrera"("eleccion_id");
CREATE INDEX "conteos_votos_carrera_dignidad_id_idx"
    ON "conteos_votos_carrera"("dignidad_id");
CREATE INDEX "conteos_votos_carrera_carrera_id_idx"
    ON "conteos_votos_carrera"("carrera_id");
CREATE INDEX "conteos_votos_carrera_candidatura_id_idx"
    ON "conteos_votos_carrera"("candidatura_id");

ALTER TABLE "conteos_votos_carrera"
    ADD CONSTRAINT "conteos_votos_carrera_eleccion_id_fkey"
    FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conteos_votos_carrera"
    ADD CONSTRAINT "conteos_votos_carrera_dignidad_id_fkey"
    FOREIGN KEY ("dignidad_id") REFERENCES "dignidades"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conteos_votos_carrera"
    ADD CONSTRAINT "conteos_votos_carrera_carrera_id_fkey"
    FOREIGN KEY ("carrera_id") REFERENCES "carreras"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conteos_votos_carrera"
    ADD CONSTRAINT "conteos_votos_carrera_candidatura_id_fkey"
    FOREIGN KEY ("candidatura_id") REFERENCES "candidaturas"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
