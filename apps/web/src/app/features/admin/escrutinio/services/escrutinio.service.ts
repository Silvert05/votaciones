import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActaEscrutinio,
  CreateImpugnacionPayload,
  EscrutinioResumen,
  ImpugnacionResultado,
  ObservacionActaPayload,
  ResolverImpugnacionPayload,
} from '../models/escrutinio.model';

@Injectable({ providedIn: 'root' })
export class EscrutinioService {
  private _http = inject(HttpClient);

  resumen(eleccionId: string): Observable<EscrutinioResumen> {
    return this._http.get<EscrutinioResumen>(
      `/escrutinio/elecciones/${eleccionId}/resumen`,
    );
  }

  generarActas(eleccionId: string): Observable<EscrutinioResumen> {
    return this._http.post<EscrutinioResumen>(
      `/escrutinio/elecciones/${eleccionId}/generar-actas`,
      {},
    );
  }

  cerrarActa(
    actaId: string,
    payload: ObservacionActaPayload = {},
  ): Observable<ActaEscrutinio> {
    return this._http.post<ActaEscrutinio>(
      `/escrutinio/actas/${actaId}/cerrar`,
      payload,
    );
  }

  aprobarActa(
    actaId: string,
    payload: ObservacionActaPayload = {},
  ): Observable<ActaEscrutinio> {
    return this._http.post<ActaEscrutinio>(
      `/escrutinio/actas/${actaId}/aprobar`,
      payload,
    );
  }

  publicarProvisionales(eleccionId: string): Observable<EscrutinioResumen> {
    return this._http.post<EscrutinioResumen>(
      `/escrutinio/elecciones/${eleccionId}/publicar-provisionales`,
      {},
    );
  }

  crearImpugnacion(
    eleccionId: string,
    payload: CreateImpugnacionPayload,
  ): Observable<ImpugnacionResultado> {
    return this._http.post<ImpugnacionResultado>(
      `/escrutinio/elecciones/${eleccionId}/impugnaciones`,
      payload,
    );
  }

  resolverImpugnacion(
    impugnacionId: string,
    payload: ResolverImpugnacionPayload,
  ): Observable<ImpugnacionResultado> {
    return this._http.patch<ImpugnacionResultado>(
      `/escrutinio/impugnaciones/${impugnacionId}/resolver`,
      payload,
    );
  }

  publicarDefinitivos(eleccionId: string): Observable<EscrutinioResumen> {
    return this._http.post<EscrutinioResumen>(
      `/escrutinio/elecciones/${eleccionId}/publicar-definitivos`,
      {},
    );
  }
}
