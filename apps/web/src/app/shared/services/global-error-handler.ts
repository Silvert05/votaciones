import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { NotifyService } from './notify.service';

/**
 * Red de seguridad: si un componente olvida manejar el error de una petición
 * (u ocurre cualquier otro error no controlado), esto evita que falle en
 * silencio. Angular/Zone.js reenvían aquí cualquier error de un observable
 * suscrito sin callback `error`, además de errores de JS no capturados.
 */
@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  private _notify = inject(NotifyService);
  private _zone = inject(NgZone);

  handleError(error: unknown): void {
    console.error(error);

    const contexto = this._contexto(error);
    const mensaje = this._mensaje(error);

    this._zone.run(() =>
      this._notify.error(
        `Ocurrió un error inesperado${contexto ? ` (${contexto})` : ''}${mensaje ? `: ${mensaje}` : ''}.`,
      ),
    );
  }

  private _contexto(error: unknown): string {
    const httpError = this._asHttpError(error);
    if (httpError) {
      return `${httpError.status || 'sin conexión'} · ${httpError.url ?? ''}`.trim();
    }
    return '';
  }

  private _mensaje(error: unknown): string {
    const httpError = this._asHttpError(error);
    if (httpError) {
      const backendMessage = (httpError.error as { message?: string | string[] })
        ?.message;
      if (backendMessage) {
        return Array.isArray(backendMessage)
          ? backendMessage.join(' ')
          : backendMessage;
      }
      return httpError.message;
    }
    if (error instanceof Error) return error.message;
    return '';
  }

  private _asHttpError(error: unknown): HttpErrorResponse | null {
    if (error instanceof HttpErrorResponse) return error;
    // Zone.js envuelve los rechazos de promesas no controlados en `rejection`.
    const rejection = (error as { rejection?: unknown })?.rejection;
    if (rejection instanceof HttpErrorResponse) return rejection;
    return null;
  }
}
