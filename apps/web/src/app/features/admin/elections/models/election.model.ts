import { Paginated } from '../../users/models/user.model';

export type TipoEleccion =
  | 'OCS'
  | 'CONSEJO_ESTUDIANTIL'
  | 'PRESIDENTES_CURSO'
  | 'OTRO';

export type EstadoEleccion =
  | 'BORRADOR'
  | 'CONVOCADA'
  | 'PADRON_PUBLICADO'
  | 'CANDIDATURAS_ABIERTAS'
  | 'CANDIDATURAS_CALIFICADAS'
  | 'CAMPANIA'
  | 'VOTACION_ABIERTA'
  | 'VOTACION_CERRADA'
  | 'ESCRUTINIO'
  | 'RESULTADOS_PROVISIONALES'
  | 'IMPUGNACION_RESULTADOS'
  | 'RESULTADOS_DEFINITIVOS'
  | 'POSESIONADA'
  | 'ANULADA';

export type TipoElector = 'DOCENTE' | 'ESTUDIANTE' | 'AMBOS';

export interface Eleccion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoEleccion;
  estado: EstadoEleccion;
  fechaConvocatoria: string | null;
  aprobadaPorOcs: boolean;
  vueltaActual: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    dignidades: number;
  };
}

export interface CronogramaElectoral {
  id: string;
  eleccionId: string;
  fechaConvocatoria: string | null;
  fechaPublicacionPadron: string | null;
  fechaInicioInscripcion: string | null;
  fechaFinInscripcion: string | null;
  fechaInicioImpugnacionCandidaturas: string | null;
  fechaFinImpugnacionCandidaturas: string | null;
  fechaPublicacionCandidaturas: string | null;
  fechaInicioCampania: string | null;
  fechaFinCampania: string | null;
  fechaInicioVotacion: string | null;
  fechaFinVotacion: string | null;
  fechaPublicacionResultados: string | null;
  fechaFinImpugnacionResultados: string | null;
  fechaResultadosFinales: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dignidad {
  id: string;
  eleccionId: string;
  nombre: string;
  descripcion: string | null;
  tipoElectorPermitido: TipoElector;
  cantidadGanadores: number;
  requiereLista: boolean;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HistorialEstadoEleccion {
  id: string;
  eleccionId: string;
  estadoAnterior: EstadoEleccion | null;
  estadoNuevo: EstadoEleccion;
  comentario: string | null;
  usuario: string | null;
  createdAt: string;
}

export interface EleccionDetalle extends Eleccion {
  cronograma: CronogramaElectoral | null;
  dignidades: Dignidad[];
  historialEstados: HistorialEstadoEleccion[];
}

export interface EleccionesQuery {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: TipoEleccion;
  estado?: EstadoEleccion;
}

export type EleccionesPaginated = Paginated<Eleccion>;

export interface CreateEleccionPayload {
  nombre: string;
  descripcion?: string | null;
  tipo: TipoEleccion;
  fechaConvocatoria?: string | null;
  aprobadaPorOcs?: boolean;
}

export interface UpdateEleccionPayload
  extends Partial<CreateEleccionPayload> {
  vueltaActual?: number;
}

export interface CambiarEstadoPayload {
  estado: EstadoEleccion;
  comentario?: string | null;
}

export type UpsertCronogramaPayload = Partial<
  Pick<
    CronogramaElectoral,
    | 'fechaConvocatoria'
    | 'fechaPublicacionPadron'
    | 'fechaInicioInscripcion'
    | 'fechaFinInscripcion'
    | 'fechaInicioImpugnacionCandidaturas'
    | 'fechaFinImpugnacionCandidaturas'
    | 'fechaPublicacionCandidaturas'
    | 'fechaInicioCampania'
    | 'fechaFinCampania'
    | 'fechaInicioVotacion'
    | 'fechaFinVotacion'
    | 'fechaPublicacionResultados'
    | 'fechaFinImpugnacionResultados'
    | 'fechaResultadosFinales'
  >
>;

export interface CreateDignidadPayload {
  nombre: string;
  descripcion?: string | null;
  tipoElectorPermitido?: TipoElector;
  cantidadGanadores?: number;
  requiereLista?: boolean;
  orden?: number;
}

export interface UpdateDignidadPayload
  extends Partial<CreateDignidadPayload> {
  activo?: boolean;
}

export const TIPOS_ELECCION: TipoEleccion[] = [
  'OCS',
  'CONSEJO_ESTUDIANTIL',
  'PRESIDENTES_CURSO',
  'OTRO',
];

export const ESTADOS_ELECCION: EstadoEleccion[] = [
  'BORRADOR',
  'CONVOCADA',
  'PADRON_PUBLICADO',
  'CANDIDATURAS_ABIERTAS',
  'CANDIDATURAS_CALIFICADAS',
  'CAMPANIA',
  'VOTACION_ABIERTA',
  'VOTACION_CERRADA',
  'ESCRUTINIO',
  'RESULTADOS_PROVISIONALES',
  'IMPUGNACION_RESULTADOS',
  'RESULTADOS_DEFINITIVOS',
  'POSESIONADA',
  'ANULADA',
];

export const TIPOS_ELECTOR: TipoElector[] = [
  'DOCENTE',
  'ESTUDIANTE',
  'AMBOS',
];

export const ESTADO_TRANSICIONES: Record<EstadoEleccion, EstadoEleccion[]> = {
  BORRADOR: ['CONVOCADA', 'ANULADA'],
  CONVOCADA: ['PADRON_PUBLICADO', 'CANDIDATURAS_ABIERTAS', 'ANULADA'],
  PADRON_PUBLICADO: ['CANDIDATURAS_ABIERTAS', 'ANULADA'],
  CANDIDATURAS_ABIERTAS: ['CANDIDATURAS_CALIFICADAS', 'ANULADA'],
  CANDIDATURAS_CALIFICADAS: ['CAMPANIA', 'ANULADA'],
  CAMPANIA: ['VOTACION_ABIERTA', 'ANULADA'],
  VOTACION_ABIERTA: ['VOTACION_CERRADA', 'ANULADA'],
  VOTACION_CERRADA: ['ESCRUTINIO', 'ANULADA'],
  ESCRUTINIO: ['RESULTADOS_PROVISIONALES', 'ANULADA'],
  RESULTADOS_PROVISIONALES: [
    'IMPUGNACION_RESULTADOS',
    'RESULTADOS_DEFINITIVOS',
    'ANULADA',
  ],
  IMPUGNACION_RESULTADOS: ['RESULTADOS_DEFINITIVOS', 'ANULADA'],
  RESULTADOS_DEFINITIVOS: ['POSESIONADA', 'ANULADA'],
  POSESIONADA: [],
  ANULADA: [],
};
