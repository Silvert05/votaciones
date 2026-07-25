import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.string().min(1, 'PORT es requerido.').transform(Number),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido.'),
    JWT_SECRET: z.string().min(1).default('cambia-este-secret-en-produccion'),
    JWT_EXPIRATION: z.string().min(1).default('7d'),
    JWT_RESET_EXPIRATION: z.string().min(1).default('15m'),
    SMTP_HOST: z.string().trim().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().trim().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().trim().optional(),
    PUBLIC_APP_URL: z.string().url().default('http://localhost:4200'),
    MAIL_MODE: z.enum(['preview', 'smtp']).default('preview'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && data.MAIL_MODE !== 'smtp') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_MODE'],
        message: 'En produccion MAIL_MODE debe ser smtp.',
      });
    }
  })
  .passthrough();

type envType = z.infer<typeof envSchema>;

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
  console.error('❌ Error en la validación de la configuración:', envParsed.error.format());
  throw new Error('Variables de entorno inválidas');
}

export const envs: envType = {
  NODE_ENV: envParsed.data.NODE_ENV,
  PORT: envParsed.data.PORT,
  DATABASE_URL: envParsed.data.DATABASE_URL,
  JWT_SECRET: envParsed.data.JWT_SECRET,
  JWT_EXPIRATION: envParsed.data.JWT_EXPIRATION,
  JWT_RESET_EXPIRATION: envParsed.data.JWT_RESET_EXPIRATION,
  SMTP_HOST: envParsed.data.SMTP_HOST,
  SMTP_PORT: envParsed.data.SMTP_PORT,
  SMTP_SECURE: envParsed.data.SMTP_SECURE,
  SMTP_USER: envParsed.data.SMTP_USER,
  SMTP_PASS: envParsed.data.SMTP_PASS,
  SMTP_FROM: envParsed.data.SMTP_FROM,
  PUBLIC_APP_URL: envParsed.data.PUBLIC_APP_URL,
  MAIL_MODE: envParsed.data.MAIL_MODE,
};
