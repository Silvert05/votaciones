import { Rol } from 'prisma/generated/enums';

export interface JwtPayload {
  sub: string;
  usuario?: string;
  rol?: Rol;
  type: 'access' | 'reset';
}

export interface AuthUser {
  id: string;
  usuario: string;
  nombre: string;
  email: string;
  rol: Rol;
  cambiarPassword: boolean;
}
