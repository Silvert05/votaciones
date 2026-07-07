import { Rol } from '../../auth/models/auth.model';

export interface User {
  id: string;
  usuario: string;
  nombre: string;
  email: string;
  rol: Rol;
  perfilId: string | null;
  perfil?: {
    id: string;
    nombre: string;
  } | null;
  activo: boolean;
  cambiarPassword: boolean;
  fechaCaducidad: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  rol?: Rol;
  perfilId?: string;
  activo?: boolean;
}

export interface CreateUserPayload {
  usuario: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  perfilId?: string | null;
}

export interface UpdateUserPayload {
  nombre: string;
  email: string;
  rol: Rol;
  perfilId?: string | null;
}
