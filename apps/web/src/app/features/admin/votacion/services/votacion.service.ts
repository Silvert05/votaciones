import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EmitirVotoPayload,
  ResultadosResponse,
  TarjetonResponse,
} from '../models/votacion.model';
import { EstadoEleccion } from '../../elections/models/election.model';

@Injectable({ providedIn: 'root' })
export class VotacionService {
  private _http = inject(HttpClient);

  abrir(eleccionId: string): Observable<{ id: string; estado: EstadoEleccion }> {
    return this._http.post<{ id: string; estado: EstadoEleccion }>(
      `/votacion/elecciones/${eleccionId}/abrir`,
      {},
    );
  }

  cerrar(eleccionId: string): Observable<{ id: string; estado: EstadoEleccion }> {
    return this._http.post<{ id: string; estado: EstadoEleccion }>(
      `/votacion/elecciones/${eleccionId}/cerrar`,
      {},
    );
  }

  tarjeton(
    eleccionId: string,
    identificacion?: string,
  ): Observable<TarjetonResponse> {
    let params = new HttpParams();
    if (identificacion) params = params.set('identificacion', identificacion);
    return this._http.get<TarjetonResponse>(
      `/votacion/elecciones/${eleccionId}/tarjeton`,
      { params },
    );
  }

  emitir(
    eleccionId: string,
    payload: EmitirVotoPayload,
  ): Observable<{ registrado: boolean; dignidades: number }> {
    return this._http.post<{ registrado: boolean; dignidades: number }>(
      `/votacion/elecciones/${eleccionId}/votar`,
      payload,
    );
  }

  resultados(eleccionId: string): Observable<ResultadosResponse> {
    return this._http.get<ResultadosResponse>(
      `/votacion/elecciones/${eleccionId}/resultados`,
    );
  }

  reporteActaPorLista(eleccionId: string): Observable<Blob> {
    return this._http.get(`/reportes/elecciones/${eleccionId}/acta-lista`, {
      responseType: 'blob',
    });
  }

  reporteParticipacionPorTipo(eleccionId: string): Observable<Blob> {
    return this._http.get(
      `/reportes/elecciones/${eleccionId}/participacion-tipo`,
      { responseType: 'blob' },
    );
  }

  reporteActaPorDignidades(eleccionId: string): Observable<Blob> {
    return this._http.get(
      `/reportes/elecciones/${eleccionId}/acta-dignidades`,
      { responseType: 'blob' },
    );
  }
}
