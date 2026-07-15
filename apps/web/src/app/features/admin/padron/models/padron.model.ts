import { TipoElector } from '../../elections/models/election.model';
import { Paginated } from '../../users/models/user.model';

export type EstadoPadronElector = 'HABILITADO' | 'INHABILITADO' | 'OBSERVADO';

export interface CatalogoInstitucional {
  id: string;
  nombre: string;
  orden: number;
}

export interface CatalogosElector {
  carreras: CatalogoInstitucional[];
  niveles: CatalogoInstitucional[];
}

export interface Elector {
  id: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  fotoUrl: string | null;
  tipo: TipoElector;
  carreraId: string | null;
  nivelId: string | null;
  carrera: CatalogoInstitucional | null;
  nivel: CatalogoInstitucional | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PadronElectoralItem {
  id: string;
  eleccionId: string;
  electorId: string;
  estado: EstadoPadronElector;
  motivo: string | null;
  observacion: string | null;
  publicado: boolean;
  fechaPublicacion: string | null;
  createdAt: string;
  updatedAt: string;
  elector: Elector;
}

export interface ElectoresQuery {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: TipoElector;
  activo?: boolean;
}

export interface PadronQuery {
  page?: number;
  limit?: number;
  search?: string;
  estado?: EstadoPadronElector;
  tipo?: TipoElector;
}

export type ElectoresPaginated = Paginated<Elector>;
export type PadronPaginated = Paginated<PadronElectoralItem>;

export interface CreateElectorPayload {
  identificacion: string;
  nombres: string;
  apellidos: string;
  email?: string | null;
  fotoUrl?: string | null;
  tipo: TipoElector;
  carreraId?: string | null;
  nivelId?: string | null;
}

export interface UpdateElectorPayload extends Partial<CreateElectorPayload> {
  activo?: boolean;
}

export interface UpdatePadronElectorPayload {
  estado: EstadoPadronElector;
  motivo?: string | null;
  observacion?: string | null;
}

export const ESTADOS_PADRON: EstadoPadronElector[] = [
  'HABILITADO',
  'INHABILITADO',
  'OBSERVADO',
];
