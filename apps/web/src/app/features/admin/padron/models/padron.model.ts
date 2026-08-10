import { TipoElector } from '../../elections/models/election.model';
import { Paginated } from '../../users/models/user.model';

export type EstadoPadronElector = 'HABILITADO' | 'INHABILITADO' | 'OBSERVADO';
export type Genero = 'MASCULINO' | 'FEMENINO' | 'OTRO';

export interface CatalogoInstitucional {
  id: string;
  nombre: string;
  orden: number;
}

export interface CatalogosElector {
  carreras: CatalogoInstitucional[];
  niveles: CatalogoInstitucional[];
  paralelos: CatalogoInstitucional[];
  jornadas: CatalogoInstitucional[];
}

export interface Elector {
  id: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  fotoUrl: string | null;
  tipo: TipoElector;
  genero: Genero | null;
  carreraId: string | null;
  nivelId: string | null;
  paraleloId: string | null;
  jornadaId: string | null;
  carrera: CatalogoInstitucional | null;
  nivel: CatalogoInstitucional | null;
  paralelo: CatalogoInstitucional | null;
  jornada: CatalogoInstitucional | null;
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
  credencialGeneradaAt: string | null;
  credencialEnviadaAt: string | null;
  credencialRevocadaAt: string | null;
  credencialEnvioError: string | null;
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
  excluirEleccionId?: string;
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
  genero?: Genero | null;
  carreraId?: string | null;
  nivelId?: string | null;
  paraleloId?: string | null;
  jornadaId?: string | null;
}

export interface UpdateElectorPayload extends Partial<CreateElectorPayload> {
  activo?: boolean;
}

export interface UpdatePadronElectorPayload {
  estado: EstadoPadronElector;
  motivo?: string | null;
  observacion?: string | null;
}

export interface PublicarPadronResponse {
  publicado: boolean;
  habilitados: number;
}

export interface ReenvioCredencialesResponse {
  pendientes: number;
  sinCorreo: number;
  enviadas: number;
  fallidas: number;
}

export interface EstadoCorreo {
  modo: 'preview' | 'smtp';
  configurado: boolean;
}

export interface CorreoPrueba {
  id: string;
  email: string;
  usuario: string;
  clave: string;
  eleccionNombre: string;
  accesoUrl: string;
  createdAt: string;
}

export const ESTADOS_PADRON: EstadoPadronElector[] = [
  'HABILITADO',
  'INHABILITADO',
  'OBSERVADO',
];
