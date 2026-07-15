import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CambiarEstadoPayload,
  ConfiguracionEleccion,
  CreateDignidadPayload,
  CreateEleccionPayload,
  Dignidad,
  EleccionDetalle,
  EleccionesPaginated,
  EleccionesQuery,
  UpdateDignidadPayload,
  UpdateEleccionPayload,
  UpsertConfiguracionPayload,
  UpsertCronogramaPayload,
  CronogramaElectoral,
  DashboardResumen,
} from '../models/election.model';

@Injectable({ providedIn: 'root' })
export class ElectionsService {
  private _http = inject(HttpClient);

  list(query: EleccionesQuery): Observable<EleccionesPaginated> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.tipo) params = params.set('tipo', query.tipo);
    if (query.estado) params = params.set('estado', query.estado);
    return this._http.get<EleccionesPaginated>('/elecciones', { params });
  }

  dashboard(): Observable<DashboardResumen> {
    return this._http.get<DashboardResumen>('/elecciones/resumen/dashboard');
  }

  get(id: string): Observable<EleccionDetalle> {
    return this._http.get<EleccionDetalle>(`/elecciones/${id}`);
  }

  create(payload: CreateEleccionPayload): Observable<EleccionDetalle> {
    return this._http.post<EleccionDetalle>('/elecciones', payload);
  }

  update(
    id: string,
    payload: UpdateEleccionPayload,
  ): Observable<EleccionDetalle> {
    return this._http.patch<EleccionDetalle>(`/elecciones/${id}`, payload);
  }

  cambiarEstado(
    id: string,
    payload: CambiarEstadoPayload,
  ): Observable<EleccionDetalle> {
    return this._http.patch<EleccionDetalle>(`/elecciones/${id}/estado`, payload);
  }

  getConfiguracion(id: string): Observable<ConfiguracionEleccion | null> {
    return this._http.get<ConfiguracionEleccion | null>(
      `/elecciones/${id}/configuracion`,
    );
  }

  upsertConfiguracion(
    id: string,
    payload: UpsertConfiguracionPayload,
  ): Observable<ConfiguracionEleccion> {
    return this._http.patch<ConfiguracionEleccion>(
      `/elecciones/${id}/configuracion`,
      payload,
    );
  }

  upsertCronograma(
    id: string,
    payload: UpsertCronogramaPayload,
  ): Observable<CronogramaElectoral> {
    return this._http.patch<CronogramaElectoral>(
      `/elecciones/${id}/cronograma`,
      payload,
    );
  }

  createDignidad(
    id: string,
    payload: CreateDignidadPayload,
  ): Observable<Dignidad> {
    return this._http.post<Dignidad>(`/elecciones/${id}/dignidades`, payload);
  }

  updateDignidad(
    id: string,
    dignidadId: string,
    payload: UpdateDignidadPayload,
  ): Observable<Dignidad> {
    return this._http.patch<Dignidad>(
      `/elecciones/${id}/dignidades/${dignidadId}`,
      payload,
    );
  }

  desactivarDignidad(id: string, dignidadId: string): Observable<Dignidad> {
    return this._http.patch<Dignidad>(
      `/elecciones/${id}/dignidades/${dignidadId}/desactivar`,
      {},
    );
  }
}
