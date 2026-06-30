export type Rol = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  usuario: string;
  nombre: string;
  email: string;
  rol: Rol;
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
