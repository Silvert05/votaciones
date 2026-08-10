import { Dignidad, EstadoEleccion } from '../../elections/models/election.model';
import { Elector } from '../../padron/models/padron.model';
import { Paginated } from '../../users/models/user.model';

export type EstadoListaElectoral =
  | 'BORRADOR'
  | 'INSCRITA'
  | 'OBSERVADA'
  | 'CALIFICADA'
  | 'RECHAZADA'
  | 'RETIRADA';

export type EstadoCandidatura =
  | 'INSCRITA'
  | 'OBSERVADA'
  | 'CALIFICADA'
  | 'RECHAZADA'
  | 'RETIRADA';

export interface ListaElectoral {
  id: string;
  eleccionId: string;
  codigo: string;
  nombre: string;
  color: string | null;
  descripcion: string | null;
  propuesta: string | null;
  estado: EstadoListaElectoral;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    candidaturas: number;
  };
}

export interface Candidatura {
  id: string;
  eleccionId: string;
  dignidadId: string;
  electorId: string;
  listaId: string | null;
  orden: number;
  estado: EstadoCandidatura;
  observacion: string | null;
  plazoSubsanacionAt: string | null;
  createdAt: string;
  updatedAt: string;
  dignidad: Pick<Dignidad, 'id' | 'nombre' | 'tipoElectorPermitido' | 'requiereLista'>;
  elector: Elector;
  lista: Pick<ListaElectoral, 'id' | 'codigo' | 'nombre' | 'color' | 'estado'> | null;
}

export interface ListasQuery {
  page?: number;
  limit?: number;
  search?: string;
  estado?: EstadoListaElectoral;
}

export interface CandidaturasQuery {
  page?: number;
  limit?: number;
  search?: string;
  dignidadId?: string;
  listaId?: string;
  estado?: EstadoCandidatura;
}

export type ListasPaginated = Paginated<ListaElectoral>;
export type CandidaturasPaginated = Paginated<Candidatura>;

export interface CreateListaPayload {
  codigo: string;
  nombre: string;
  color?: string | null;
  descripcion?: string | null;
  propuesta?: string | null;
}

export interface UpdateListaPayload extends Partial<CreateListaPayload> {
  estado?: EstadoListaElectoral;
  observacion?: string | null;
}

export interface CreateCandidaturaPayload {
  dignidadId: string;
  electorId: string;
  listaId?: string | null;
  orden?: number;
}

export interface UpdateCandidaturaPayload {
  listaId?: string | null;
  orden?: number;
  estado?: EstadoCandidatura;
  observacion?: string | null;
}

export interface CalificarCandidaturaPayload {
  estado: EstadoCandidatura;
  observacion?: string | null;
}

export interface EstadoEleccionResponse {
  id: string;
  estado: EstadoEleccion;
}

export const ESTADOS_LISTA: EstadoListaElectoral[] = [
  'BORRADOR',
  'INSCRITA',
  'CALIFICADA',
  'RECHAZADA',
  'RETIRADA',
];

export const ESTADOS_CANDIDATURA: EstadoCandidatura[] = [
  'INSCRITA',
  'OBSERVADA',
  'CALIFICADA',
  'RECHAZADA',
  'RETIRADA',
];

export interface SubsanarCandidaturaPayload {
  observacion?: string | null;
}

export interface ImpugnarCalificacionPayload {
  presentadoPor: string;
  correoNotificacion: string;
  fundamento: string;
}

export interface ImpugnacionCandidatura {
  id: string;
  eleccionId: string;
  candidaturaId: string;
  presentadoPor: string;
  correoNotificacion: string;
  fundamento: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  resolucion: string | null;
  fechaPresentacion: string;
  fechaResolucion: string | null;
}

export interface ResolverImpugnacionCandidaturaPayload {
  estado: 'ACEPTADA' | 'RECHAZADA';
  resolucion: string;
}

export interface DignidadListaEstado {
  id: string;
  nombre: string;
  orden: number;
  habilitado: boolean;
}

export interface SetDignidadListaEstadoPayload {
  habilitado: boolean;
}