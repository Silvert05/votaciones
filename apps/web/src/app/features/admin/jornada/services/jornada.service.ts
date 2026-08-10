import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IniciarVotacionPayload,
  JornadaEstado,
  PasoPayload,
} from '../models/jornada.model';

@Injectable({ providedIn: 'root' })
export class JornadaService {
  private _http = inject(HttpClient);

  estado(eleccionId: string): Observable<JornadaEstado> {
    return this._http.get<JornadaEstado>(`/jornada/elecciones/${eleccionId}`);
  }

  inicializar(eleccionId: string, payload: PasoPayload = {}): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/inicializar`,
      payload,
    );
  }

  puestaCero(eleccionId: string, payload: PasoPayload = {}): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/puesta-a-cero`,
      payload,
    );
  }

  iniciarVotacion(
    eleccionId: string,
    payload: IniciarVotacionPayload = {},
  ): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/iniciar-votacion`,
      payload,
    );
  }

  cerrarVotacion(eleccionId: string, payload: PasoPayload = {}): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/cerrar-votacion`,
      payload,
    );
  }

  generarResultados(eleccionId: string, payload: PasoPayload = {}): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/generar-resultados`,
      payload,
    );
  }

  reactivarLink(eleccionId: string): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/reactivar-link`,
      {},
    );
  }

  reiniciar(eleccionId: string, motivo: string): Observable<JornadaEstado> {
    return this._http.post<JornadaEstado>(
      `/jornada/elecciones/${eleccionId}/reiniciar`,
      { motivo },
    );
  }
}
