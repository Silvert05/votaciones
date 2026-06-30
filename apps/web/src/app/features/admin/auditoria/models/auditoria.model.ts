export interface AuditLog {
  id: number;
  tabla: string;
  registroId: string | null;
  operacion: string;
  datosAnteriores: Record<string, unknown> | null;
  datosNuevos: Record<string, unknown> | null;
  usuario: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditoriaQuery {
  page?: number;
  limit?: number;
  tabla?: string;
  operacion?: string;
  usuario?: string;
  desde?: string;
  hasta?: string;
}

export interface PaginatedAudit {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
