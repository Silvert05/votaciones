import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

/** Permite el acceso solo a usuarios autenticados. */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/auth/login'], {
    queryParams: { redirectURL: state.url },
  });
};

/** Impide el acceso a páginas de invitado (login) si ya hay sesión. */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([authService.homeUrl()]);
};

/**
 * Restringe una ruta a los roles indicados. Si el usuario no tiene el rol,
 * se le redirige a una ruta segura para su usuario. Úsalo como
 * `roleGuard(['ADMIN'])`.
 */
export const roleGuard =
  (roles: Rol[]): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const rol = authService.user()?.rol;
    if (rol && roles.includes(rol)) {
      return true;
    }

    return router.createUrlTree([authService.homeUrl()]);
  };

/** Restringe pantallas administrativas segun las rutas asignadas al perfil. */
export const optionGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.canAccessRoute(state.url)) {
    return true;
  }

  return router.createUrlTree([authService.homeUrl()]);
};
