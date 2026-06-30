/** Operaciones registradas en auditoría (columna VARCHAR(10)). */
export const AuditOperacion = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  ESTADO: 'ESTADO',
  RESET: 'RESET',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD: 'PASSWORD',
} as const;

export type AuditOperacion =
  (typeof AuditOperacion)[keyof typeof AuditOperacion];

/** Tablas / contextos auditados. */
export const AuditTabla = {
  USUARIOS: 'usuarios',
  AUTH: 'auth',
} as const;
