import { Paginated } from '../../users/models/user.model';

export type TipoEleccion =
  | 'INSTITUCIONAL'
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
  vueltaActual: number;
  portalPublico: boolean;
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
  ordenHitos: string[];
  etiquetasHitos: Record<string, string> | null;
  detallesHitos: Record<string, HitoDetalle> | null;
  publicado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HitoDetalle {
  fechaFin?: string | null;
  descripcion?: string | null;
}

export interface CronogramaItem {
  id: string;
  eleccionId: string;
  nombre: string;
  /** Un ítem puede tener solo inicio, solo fin (fecha límite) o ambas. */
  fecha: string | null;
  fechaFin: string | null;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCronogramaItemPayload {
  nombre: string;
  fecha?: string | null;
  fechaFin?: string | null;
  descripcion?: string | null;
}

export type UpdateCronogramaItemPayload = Partial<CreateCronogramaItemPayload>;

export interface ConfiguracionEleccion {
  id: string;
  eleccionId: string;
  nombreInstitucion: string | null;
  logoUrl: string | null;
  escudoUrl: string | null;
  videoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorAcento: string | null;
  mensajeBienvenida: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpsertConfiguracionPayload = Partial<
  Pick<
    ConfiguracionEleccion,
    | 'nombreInstitucion'
    | 'logoUrl'
    | 'escudoUrl'
    | 'videoUrl'
    | 'colorPrimario'
    | 'colorSecundario'
    | 'colorAcento'
    | 'mensajeBienvenida'
  >
>;

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
  configuracion: ConfiguracionEleccion | null;
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
    | 'detallesHitos'
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
  'INSTITUCIONAL',
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
  // El escrutinio se hace dentro de "Jornada electoral" (no hay pantalla propia
  // en Gestión). Desde "Votación cerrada" el avance a resultados lo hace la
  // Jornada al generar resultados, por eso no se ofrece como salto manual.
  VOTACION_CERRADA: ['ANULADA'],
  ESCRUTINIO: ['RESULTADOS_PROVISIONALES', 'ANULADA'],
  // La ventana de "Impugnación de resultados" no tiene pantalla propia (todo
  // el cierre se gestiona desde Jornada electoral), por eso no se ofrece como
  // salto manual. El estado se conserva en el enum por compatibilidad histórica.
  RESULTADOS_PROVISIONALES: ['RESULTADOS_DEFINITIVOS', 'ANULADA'],
  IMPUGNACION_RESULTADOS: ['RESULTADOS_DEFINITIVOS', 'ANULADA'],
  RESULTADOS_DEFINITIVOS: ['POSESIONADA', 'ANULADA'],
  POSESIONADA: [],
  ANULADA: [],
};

export interface DashboardResumen {
  resumen: {
    totalElecciones: number;
    procesosActivos: number;
    electores: number;
    electoresActivos: number;
    listas: number;
    candidaturasCalificadas: number;
    votosEmitidos: number;
  };
  procesoActual: {
    id: string;
    nombre: string;
    estado: EstadoEleccion;
    updatedAt: string;
    cronograma: {
      fechaInicioVotacion: string | null;
      fechaFinVotacion: string | null;
    } | null;
    _count: {
      dignidades: number;
      padron: number;
      candidaturas: number;
      votosEmitidos: number;
    };
  } | null;
  participacion: {
    habilitados: number;
    votantes: number;
    porcentaje: number;
  };
  recientes: Array<{
    id: string;
    nombre: string;
    estado: EstadoEleccion;
    updatedAt: string;
    _count: { padron: number; candidaturas: number; votosEmitidos: number };
  }>;
}
