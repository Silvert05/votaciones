export type Rol = 'ADMIN' | 'USER';

export interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'group' | 'basic';
  icon?: string;
  link?: string;
  children?: MenuItem[];
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

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token?: string;
  user?: AuthUser;
  changePassword?: boolean;
  accessToken?: string;
}

export interface MessageResponse {
  message: string;
}
