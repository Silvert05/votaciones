-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "usuario" VARCHAR(150) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USER',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "email" VARCHAR(150) NOT NULL,
    "cambiar_password" BOOLEAN NOT NULL DEFAULT false,
    "fecha_caducidad" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "tabla" VARCHAR(80) NOT NULL,
    "registro_id" UUID,
    "operacion" VARCHAR(10) NOT NULL,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "usuario" VARCHAR(100),
    "ip" INET,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "usuarios_usuario_idx" ON "usuarios"("usuario");

-- CreateIndex
CREATE INDEX "auditoria_tabla_created_at_idx" ON "auditoria"("tabla", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auditoria_registro_id_idx" ON "auditoria"("registro_id");
