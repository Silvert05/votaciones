import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateElectorPayload,
  Elector,
  ElectoresPaginated,
  ElectoresQuery,
  PadronElectoralItem,
  PadronPaginated,
  PadronQuery,
  UpdateElectorPayload,
  UpdatePadronElectorPayload,
} from '../models/padron.model';

@Injectable({ providedIn: 'root' })
export class PadronService {
  private _http = inject(HttpClient);

  listElectores(query: ElectoresQuery): Observable<ElectoresPaginated> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.tipo) params = params.set('tipo', query.tipo);
    if (query.activo !== undefined) params = params.set('activo', query.activo);
    return this._http.get<ElectoresPaginated>('/padrones/electores', { params });
  }

  createElector(payload: CreateElectorPayload): Observable<Elector> {
    return this._http.post<Elector>('/padrones/electores', payload);
  }

  updateElector(id: string, payload: UpdateElectorPayload): Observable<Elector> {
    return this._http.patch<Elector>(`/padrones/electores/${id}`, payload);
  }

  setElectorActivo(id: string, activo: boolean): Observable<Elector> {
    return this._http.patch<Elector>(`/padrones/electores/${id}/estado`, {
      activo,
    });
  }

  listPadron(eleccionId: string, query: PadronQuery): Observable<PadronPaginated> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.tipo) params = params.set('tipo', query.tipo);
    return this._http.get<PadronPaginated>(`/padrones/elecciones/${eleccionId}`, {
      params,
    });
  }

  asignarElectores(eleccionId: string, electorIds: string[]): Observable<{ asignados: number }> {
    return this._http.post<{ asignados: number }>(
      `/padrones/elecciones/${eleccionId}/asignar`,
      { electorIds },
    );
  }

  autoGenerar(eleccionId: string): Observable<{ autogenerados: number; totalElegibles: number }> {
    return this._http.post<{ autogenerados: number; totalElegibles: number }>(
      `/padrones/elecciones/${eleccionId}/auto-generar`,
      {},
    );
  }

  updatePadronElector(
    eleccionId: string,
    padronId: string,
    payload: UpdatePadronElectorPayload,
  ): Observable<PadronElectoralItem> {
    return this._http.patch<PadronElectoralItem>(
      `/padrones/elecciones/${eleccionId}/items/${padronId}`,
      payload,
    );
  }

  publicar(eleccionId: string): Observable<{ publicado: boolean; habilitados: number }> {
    return this._http.post<{ publicado: boolean; habilitados: number }>(
      `/padrones/elecciones/${eleccionId}/publicar`,
      {},
    );
  }
}