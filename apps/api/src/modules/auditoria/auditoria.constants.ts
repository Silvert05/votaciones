/** Operaciones registradas en auditoria (columna VARCHAR(10)). */
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
  PERFILES: 'perfiles',
  OPCIONES: 'opciones',
  ELECCIONES: 'elecciones',
  DIGNIDADES: 'dignidades',
  CRONOGRAMAS: 'cronogramas_electorales',
  ELECTORES: 'electores',
  PADRONES: 'padrones_electorales',
  LISTAS_ELECTORALES: 'listas_electorales',
  CANDIDATURAS: 'candidaturas',
  VOTOS_EMITIDOS: 'votos_emitidos',
  CONTEOS_VOTOS: 'conteos_votos',
  ACTAS_ESCRUTINIO: 'actas_escrutinio',
  IMPUGNACIONES_RESULTADOS: 'impugnaciones_resultados',
  AUTH: 'auth',
} as const;
