import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from 'environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Antepone la URL base del API a las peticiones relativas, adjunta el token JWT
 * y, ante un 401, limpia la sesión y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let request = req;

  // Antepone la URL base del API a las rutas relativas del backend.
  if (req.url.startsWith('/') && !req.url.startsWith('//')) {
    request = request.clone({ url: `${environment.api}${req.url}` });
  }

  // Adjunta el token salvo que la petición ya traiga Authorization propio
  // (p. ej. el flujo de restablecimiento con token temporal).
  const token = authService.accessToken;
  if (token && !request.headers.has('Authorization')) {
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && authService.isAuthenticated()) {
        authService.clearSession();
        router.navigate(['/admin/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
