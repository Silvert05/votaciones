import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateOpcionPayload,
  CreatePerfilPayload,
  Opcion,
  Perfil,
  PerfilDetalle,
  UpdateOpcionPayload,
  UpdatePerfilPayload,
  UserAccess,
} from '../models/security.model';

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private _http = inject(HttpClient);

  access(): Observable<UserAccess> {
    return this._http.get<UserAccess>('/seguridad/mi-menu');
  }

  listOpciones(): Observable<Opcion[]> {
    return this._http.get<Opcion[]>('/seguridad/opciones');
  }

  createOpcion(payload: CreateOpcionPayload): Observable<Opcion> {
    return this._http.post<Opcion>('/seguridad/opciones', payload);
  }

  updateOpcion(id: string, payload: UpdateOpcionPayload): Observable<Opcion> {
    return this._http.patch<Opcion>(`/seguridad/opciones/${id}`, payload);
  }

  setOpcionActivo(id: string, activo: boolean): Observable<Opcion> {
    return this._http.patch<Opcion>(`/seguridad/opciones/${id}/estado`, {
      activo,
    });
  }

  listPerfiles(): Observable<Perfil[]> {
    return this._http.get<Perfil[]>('/seguridad/perfiles');
  }

  getPerfil(id: string): Observable<PerfilDetalle> {
    return this._http.get<PerfilDetalle>(`/seguridad/perfiles/${id}`);
  }

  createPerfil(payload: CreatePerfilPayload): Observable<Perfil> {
    return this._http.post<Perfil>('/seguridad/perfiles', payload);
  }

  updatePerfil(id: string, payload: UpdatePerfilPayload): Observable<Perfil> {
    return this._http.patch<Perfil>(`/seguridad/perfiles/${id}`, payload);
  }

  setPerfilActivo(id: string, activo: boolean): Observable<Perfil> {
    return this._http.patch<Perfil>(`/seguridad/perfiles/${id}/estado`, {
      activo,
    });
  }

  setPerfilOpciones(id: string, opcionIds: string[]): Observable<PerfilDetalle> {
    return this._http.patch<PerfilDetalle>(`/seguridad/perfiles/${id}/opciones`, {
      opcionIds,
    });
  }
}
