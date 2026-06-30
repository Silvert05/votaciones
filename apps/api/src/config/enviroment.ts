import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z.string().min(1, 'PORT es requerido.').transform(Number),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido.'),
    JWT_SECRET: z.string().min(1).default('cambia-este-secret-en-produccion'),
    JWT_EXPIRATION: z.string().min(1).default('7d'),
    JWT_RESET_EXPIRATION: z.string().min(1).default('15m'),
  })
  .passthrough();

type envType = z.infer<typeof envSchema>;

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error('❌ Error en la validación de la configuración:', envParsed.error.format());
  throw new Error('Variables de entorno inválidas');
}

export const envs: envType = {
  PORT: envParsed.data.PORT,
  DATABASE_URL: envParsed.data.DATABASE_URL,
  JWT_SECRET: envParsed.data.JWT_SECRET,
  JWT_EXPIRATION: envParsed.data.JWT_EXPIRATION,
  JWT_RESET_EXPIRATION: envParsed.data.JWT_RESET_EXPIRATION,
};
