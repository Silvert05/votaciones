-- CreateTable
CREATE TABLE "configuraciones_eleccion" (
    "id" UUID NOT NULL,
    "eleccion_id" UUID NOT NULL,
    "nombre_institucion" VARCHAR(200),
    "logo_url" TEXT,
    "escudo_url" TEXT,
    "video_url" TEXT,
    "color_primario" VARCHAR(20),
    "color_secundario" VARCHAR(20),
    "color_acento" VARCHAR(20),
    "mensaje_bienvenida" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_eleccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_eleccion_eleccion_id_key" ON "configuraciones_eleccion"("eleccion_id");

-- AddForeignKey
ALTER TABLE "configuraciones_eleccion" ADD CONSTRAINT "configuraciones_eleccion_eleccion_id_fkey" FOREIGN KEY ("eleccion_id") REFERENCES "elecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
