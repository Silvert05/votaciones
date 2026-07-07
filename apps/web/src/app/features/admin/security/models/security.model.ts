import { MenuItem } from '../../auth/models/auth.model';

export type TipoOpcion = 'GRUPO' | 'PANTALLA';

export interface Opcion {
  id: string;
  codigo: string;
  titulo: string;
  subtitulo: string | null;
  ruta: string | null;
  icono: string | null;
  tipo: TipoOpcion;
  orden: number;
  activo: boolean;
  padreId: string | null;
  padre?: {
    id: string;
    titulo: string;
    codigo: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Perfil {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    opciones: number;
    usuarios: number;
  };
}

export interface PerfilDetalle extends Perfil {
  opcionIds: string[];
}

export interface UserAccess {
  perfil: {
    id: string;
    nombre: string;
  } | null;
  menu: MenuItem[];
  rutasPermitidas: string[];
  codigosPermitidos: string[];
}

export interface CreateOpcionPayload {
  codigo: string;
  titulo: string;
  subtitulo?: string | null;
  ruta?: string | null;
  icono?: string | null;
  tipo: TipoOpcion;
  orden: number;
  padreId?: string | null;
}

export type UpdateOpcionPayload = Partial<CreateOpcionPayload>;

export interface CreatePerfilPayload {
  nombre: string;
  descripcion?: string | null;
}

export type UpdatePerfilPayload = Partial<CreatePerfilPayload>;
