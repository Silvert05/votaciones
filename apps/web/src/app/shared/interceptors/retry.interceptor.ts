import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { timer } from 'rxjs';
import { retry } from 'rxjs/operators';

const REINTENTOS = 2;
const ESPERA_MS = 400;

/**
 * Reintenta automaticamente una peticion GET que falla por un problema
 * transitorio (sin red, o el backend recien arrancando/reconectando a la
 * base de datos: 502/503/504). No reintenta escrituras (POST/PATCH/DELETE)
 * para no duplicar un efecto secundario (p. ej. un correo enviado dos
 * veces), ni errores 4xx (reintentar no arregla una credencial invalida
 * o un permiso faltante, solo demoraria mostrar el motivo real).
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: REINTENTOS,
      delay: (error: unknown, retryCount: number) => {
        const esTransitorio =
          error instanceof HttpErrorResponse &&
          (error.status === 0 || [502, 503, 504].includes(error.status));
        if (!esTransitorio) {
          throw error;
        }
        return timer(ESPERA_MS * retryCount);
      },
    }),
  );
};
