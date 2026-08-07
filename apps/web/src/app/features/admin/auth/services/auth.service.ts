import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  MenuItem,
  MessageResponse,
} from '../models/auth.model';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';
const ADMIN_HOME = '/admin/elecciones/jornada';
const HIDDEN_ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/elecciones/votacion',
  '/admin/elecciones/escrutinio',
  '/admin/elecciones/impugnaciones',
  '/admin/elecciones/resultados-finales',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _http = inject(HttpClient);

  private _user = signal<AuthUser | null>(this._readStoredUser());

  /** Usuario autenticado (reactivo). */
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly menu = computed<MenuItem[]>(() =>
    this._filterVisibleMenu(this._user()?.menu ?? []),
  );
  readonly rutasPermitidas = computed<string[]>(
    () =>
      (this._user()?.rutasPermitidas ?? []).filter(
        (ruta) => !this._isHiddenRoute(ruta),
      ),
  );

  /** Inicia sesión. Puede devolver el flujo de cambio forzado de contraseña. */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this._http.post<LoginResponse>('/auth/login', credentials).pipe(
      tap((res) => {
        if (res.access_token && res.user) {
          this._setSession(res.access_token, res.user);
        }
      }),
    );
  }

  /**
   * Restablecimiento forzado de contraseña (primer ingreso). Usa el token
   * temporal devuelto por el login.
   */
  resetPassword(newPassword: string, resetToken: string): Observable<LoginResponse> {
    return this._http
      .post<LoginResponse>(
        '/auth/reset-password',
        { newPassword },
        { headers: { Authorization: `Bearer ${resetToken}` } },
      )
      .pipe(
        tap((res) => {
          if (res.access_token && res.user) {
            this._setSession(res.access_token, res.user);
          }
        }),
      );
  }

  /** Cambio de contraseña del usuario autenticado. */
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<MessageResponse> {
    return this._http.post<MessageResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /** Obtiene el perfil del usuario autenticado desde el servidor. */
  profile(): Observable<AuthUser> {
    return this._http
      .get<AuthUser>('/auth/me')
      .pipe(tap((user) => this._patchUser(user)));
  }

  /** Refresca menu y rutas permitidas desde el backend. */
  refreshAccess(): Observable<AuthUser> {
    return this.profile();
  }

  /** Actualiza el perfil del usuario autenticado. */
  updateProfile(data: {
    nombre: string;
    email?: string;
  }): Observable<AuthUser> {
    return this._http
      .patch<AuthUser>('/auth/me', data)
      .pipe(tap((user) => this._patchUser(user)));
  }

  /** Cierra la sesión (servidor + cliente). */
  logout(): Observable<MessageResponse> {
    return this._http
      .post<MessageResponse>('/auth/logout', {})
      .pipe(tap(() => this.clearSession()));
  }

  /** Token JWT de acceso almacenado. */
  get accessToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  canAccessRoute(url: string): boolean {
    const user = this._user();
    if (!user) {
      return false;
    }

    const normalized = this._normalizeUrl(url);
    if (this._isHiddenRoute(normalized)) {
      return false;
    }
    if (normalized === ADMIN_HOME || normalized === '/admin/perfil') {
      return true;
    }

    const rutas = user.rutasPermitidas ?? [];
    if (user.rol === 'ADMIN' && rutas.length === 0) {
      return true;
    }

    return rutas.some(
      (ruta) => normalized === ruta || normalized.startsWith(`${ruta}/`),
    );
  }

  /** Limpia la sesión local. */
  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  private _setSession(token: string, user: AuthUser): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private _patchUser(user: AuthUser): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private _readStoredUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private _normalizeUrl(url: string): string {
    const [path] = url.split('?');
    return path.replace(/\/$/, '') || '/';
  }

  private _isHiddenRoute(url: string): boolean {
    const normalized = this._normalizeUrl(url);
    return HIDDEN_ADMIN_ROUTES.some(
      (ruta) => normalized === ruta || normalized.startsWith(`${ruta}/`),
    );
  }

  private _filterVisibleMenu(items: MenuItem[]): MenuItem[] {
    return items
      .filter((item) => !item.link || !this._isHiddenRoute(item.link))
      .map((item) => ({
        ...item,
        children: item.children
          ? this._filterVisibleMenu(item.children)
          : undefined,
      }))
      .filter(
        (item) =>
          item.type !== 'group' || (item.children?.length ?? 0) > 0,
      );
  }
}
