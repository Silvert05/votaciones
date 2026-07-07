import { Rol } from 'prisma/generated/enums';
import type { MenuItem } from 'src/modules/seguridad/seguridad.service';

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
  perfil?: {
    id: string;
    nombre: string;
  } | null;
  menu?: MenuItem[];
  rutasPermitidas?: string[];
  codigosPermitidos?: string[];
  cambiarPassword: boolean;
}
