-- Las credenciales de votación no deben persistirse en texto plano.
ALTER TABLE "padrones_electorales"
    DROP COLUMN IF EXISTS "credencial_temporal",
    ADD COLUMN IF NOT EXISTS "credencial_enviada_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "credencial_revocada_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "credencial_envio_error" TEXT,
    ADD COLUMN IF NOT EXISTS "credencial_version" INTEGER NOT NULL DEFAULT 0;
