import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CalificarCandidaturaPayload,
  Candidatura,
  CandidaturasPaginated,
  CandidaturasQuery,
  CreateCandidaturaPayload,
  CreateListaPayload,
  DignidadListaEstado,
  EstadoEleccionResponse,
  ListaElectoral,
  ListasPaginated,
  ListasQuery,
  SetDignidadListaEstadoPayload,
  UpdateCandidaturaPayload,
  UpdateListaPayload,
} from '../models/candidatura.model';

@Injectable({ providedIn: 'root' })
export class CandidaturasService {
  private _http = inject(HttpClient);

  abrir(eleccionId: string): Observable<EstadoEleccionResponse> {
    return this._http.post<EstadoEleccionResponse>(
      `/candidaturas/elecciones/${eleccionId}/abrir`,
      {},
    );
  }

  cerrarCalificacion(eleccionId: string): Observable<EstadoEleccionResponse> {
    return this._http.post<EstadoEleccionResponse>(
      `/candidaturas/elecciones/${eleccionId}/cerrar-calificacion`,
      {},
    );
  }

  listListas(eleccionId: string, query: ListasQuery): Observable<ListasPaginated> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.estado) params = params.set('estado', query.estado);
    return this._http.get<ListasPaginated>(
      `/candidaturas/elecciones/${eleccionId}/listas`,
      { params },
    );
  }

  createLista(eleccionId: string, payload: CreateListaPayload): Observable<ListaElectoral> {
    return this._http.post<ListaElectoral>(
      `/candidaturas/elecciones/${eleccionId}/listas`,
      payload,
    );
  }

  updateLista(
    eleccionId: string,
    listaId: string,
    payload: UpdateListaPayload,
  ): Observable<ListaElectoral> {
    return this._http.patch<ListaElectoral>(
      `/candidaturas/elecciones/${eleccionId}/listas/${listaId}`,
      payload,
    );
  }

  listDignidadesPorLista(
    eleccionId: string,
    listaId: string,
  ): Observable<DignidadListaEstado[]> {
    return this._http.get<DignidadListaEstado[]>(
      `/candidaturas/elecciones/${eleccionId}/listas/${listaId}/dignidades`,
    );
  }

  setDignidadHabilitada(
    eleccionId: string,
    listaId: string,
    dignidadId: string,
    payload: SetDignidadListaEstadoPayload,
  ): Observable<{ habilitado: boolean }> {
    return this._http.patch<{ habilitado: boolean }>(
      `/candidaturas/elecciones/${eleccionId}/listas/${listaId}/dignidades/${dignidadId}`,
      payload,
    );
  }

  listCandidaturas(
    eleccionId: string,
    query: CandidaturasQuery,
  ): Observable<CandidaturasPaginated> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.dignidadId) params = params.set('dignidadId', query.dignidadId);
    if (query.listaId) params = params.set('listaId', query.listaId);
    if (query.estado) params = params.set('estado', query.estado);
    return this._http.get<CandidaturasPaginated>(
      `/candidaturas/elecciones/${eleccionId}`,
      { params },
    );
  }

  createCandidatura(
    eleccionId: string,
    payload: CreateCandidaturaPayload,
  ): Observable<Candidatura> {
    return this._http.post<Candidatura>(
      `/candidaturas/elecciones/${eleccionId}`,
      payload,
    );
  }

  updateCandidatura(
    eleccionId: string,
    candidaturaId: string,
    payload: UpdateCandidaturaPayload,
  ): Observable<Candidatura> {
    return this._http.patch<Candidatura>(
      `/candidaturas/elecciones/${eleccionId}/${candidaturaId}`,
      payload,
    );
  }

  calificar(
    eleccionId: string,
    candidaturaId: string,
    payload: CalificarCandidaturaPayload,
  ): Observable<Candidatura> {
    return this._http.patch<Candidatura>(
      `/candidaturas/elecciones/${eleccionId}/${candidaturaId}/calificacion`,
      payload,
    );
  }
}