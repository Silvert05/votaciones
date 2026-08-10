/** Operaciones registradas en auditoria (columna VARCHAR(10)). */
export const AuditOperacion = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  ESTADO: 'ESTADO',
  RESET: 'RESET',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD: 'PASSWORD',
  DESCARGAR: 'DESCARGAR',
} as const;

export type AuditOperacion =
  (typeof AuditOperacion)[keyof typeof AuditOperacion];

/** Tablas / contextos auditados. */
export const AuditTabla = {
  USUARIOS: 'usuarios',
  PERFILES: 'perfiles',
  OPCIONES: 'opciones',
  ELECCIONES: 'elecciones',
  CONFIGURACIONES_ELECCION: 'configuraciones_eleccion',
  JORNADAS_ELECTORALES: 'jornadas_electorales',
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
  IMPUGNACIONES_CANDIDATURAS: 'impugnaciones_candidaturas',
  REPORTES: 'reportes',
  AUTH: 'auth',
} as const;
