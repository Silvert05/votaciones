import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateUserPayload,
  Paginated,
  UpdateUserPayload,
  User,
  UsersQuery,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private _http = inject(HttpClient);

  list(query: UsersQuery): Observable<Paginated<User>> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.rol) params = params.set('rol', query.rol);
    if (query.perfilId) params = params.set('perfilId', query.perfilId);
    if (query.activo !== undefined) {
      params = params.set('activo', query.activo);
    }
    return this._http.get<Paginated<User>>('/users', { params });
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this._http.post<User>('/users', payload);
  }

  update(id: string, payload: UpdateUserPayload): Observable<User> {
    return this._http.patch<User>(`/users/${id}`, payload);
  }

  setActivo(id: string, activo: boolean): Observable<User> {
    return this._http.patch<User>(`/users/${id}/estado`, { activo });
  }

  resetPassword(id: string, password: string): Observable<User> {
    return this._http.post<User>(`/users/${id}/reset-password`, { password });
  }
}
