import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuditoriaQuery,
  PaginatedAudit,
} from '../models/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private _http = inject(HttpClient);

  list(query: AuditoriaQuery): Observable<PaginatedAudit> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.tabla) params = params.set('tabla', query.tabla);
    if (query.operacion) params = params.set('operacion', query.operacion);
    if (query.usuario) params = params.set('usuario', query.usuario);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    return this._http.get<PaginatedAudit>('/auditoria', { params });
  }
}
