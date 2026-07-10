import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface ConfiguracionEleccion {
  nombreInstitucion: string | null;
  logoUrl: string | null;
  escudoUrl: string | null;
  videoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorAcento: string | null;
  mensajeBienvenida: string | null;
}

export interface LandingEleccion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  estado: string;
  configuracion: ConfiguracionEleccion | null;
  votarDisponible: boolean;
  resultadosDisponibles: boolean;
  fechaFinVotacion: string | null;
}

export interface CandidatoVotante {
  id: string;
  orden: number;
  elector: {
    id: string;
    identificacion: string;
    nombres: string;
    apellidos: string;
    tipo: string;
    fotoUrl: string | null;
  };
  lista: { id: string; codigo: string; nombre: string; color: string | null } | null;
}

export interface DignidadVotante {
  id: string;
  nombre: string;
  descripcion: string | null;
  cantidadGanadores: number;
  requiereLista: boolean;
  tipoElectorPermitido: string;
  candidaturas: CandidatoVotante[];
}

export interface TarjetonVotante {
  eleccion: { id: string; nombre: string; institucion: string | null };
  dignidades: DignidadVotante[];
  votosEmitidos: string[];
}

export interface VotanteLoginResponse {
  token: string;
  elector: {
    id: string;
    identificacion: string;
    nombres: string;
    apellidos: string;
  };
  eleccion: { id: string; nombre: string; institucion: string | null };
}

export interface VotoSeleccion {
  dignidadId: string;
  tipo: 'CANDIDATO' | 'BLANCO' | 'NULO';
  candidaturaId?: string | null;
}

export interface ResultadosPublicos {
  eleccion: { id: string; nombre: string; estado: string };
  padronHabilitado: number;
  dignidades: Array<{ id: string; nombre: string; cantidadGanadores: number }>;
  emitidos: Array<{ dignidadId: string; total: number }>;
  conteos: Array<{
    id: string;
    dignidadId: string;
    candidaturaId: string | null;
    tipo: 'CANDIDATO' | 'BLANCO' | 'NULO';
    opcionKey: string;
    total: number;
    candidatura: {
      id: string;
      elector: { identificacion: string; nombres: string; apellidos: string };
      lista: { codigo: string; nombre: string; color: string | null } | null;
    } | null;
  }>;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface ParticipacionPublica {
  eleccion: { id: string; nombre: string; estado: string };
  padronHabilitado: number;
  votantes: number;
  porcentaje: number;
  dignidades: Array<{ dignidadId: string; nombre: string; total: number }>;
}

export interface CandidatosPublicos {
  eleccion: { id: string; nombre: string; institucion: string | null };
  dignidades: Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    cantidadGanadores: number;
    candidaturas: CandidatoVotante[];
  }>;
}

const VOTO_TOKEN_KEY = 'venp_voto_token';

@Injectable({ providedIn: 'root' })
export class VenpService {
  private _http = inject(HttpClient);

  get votoToken(): string | null {
    return sessionStorage.getItem(VOTO_TOKEN_KEY);
  }

  private _setToken(token: string | null): void {
    if (token) sessionStorage.setItem(VOTO_TOKEN_KEY, token);
    else sessionStorage.removeItem(VOTO_TOKEN_KEY);
  }

  private _votoHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.votoToken ?? ''}` });
  }

  listElecciones(): Observable<LandingEleccion[]> {
    return this._http.get<LandingEleccion[]>('/publico/elecciones');
  }

  landing(eleccionId: string): Observable<LandingEleccion> {
    return this._http.get<LandingEleccion>(`/publico/elecciones/${eleccionId}`);
  }

  resultados(eleccionId: string): Observable<ResultadosPublicos> {
    return this._http.get<ResultadosPublicos>(
      `/publico/elecciones/${eleccionId}/resultados`,
    );
  }

  participacion(eleccionId: string): Observable<ParticipacionPublica> {
    return this._http.get<ParticipacionPublica>(
      `/publico/elecciones/${eleccionId}/participacion`,
    );
  }

  candidatos(eleccionId: string): Observable<CandidatosPublicos> {
    return this._http.get<CandidatosPublicos>(
      `/publico/elecciones/${eleccionId}/candidatos`,
    );
  }

  login(
    eleccionId: string,
    identificacion: string,
    password: string,
  ): Observable<VotanteLoginResponse> {
    return this._http
      .post<VotanteLoginResponse>(
        `/publico/elecciones/${eleccionId}/votante/login`,
        { identificacion, password },
      )
      .pipe(tap((res) => this._setToken(res.token)));
  }

  tarjeton(): Observable<TarjetonVotante> {
    return this._http.get<TarjetonVotante>('/publico/votante/tarjeton', {
      headers: this._votoHeaders(),
    });
  }

  emitir(votos: VotoSeleccion[]): Observable<{ registrado: boolean; dignidades: number }> {
    return this._http.post<{ registrado: boolean; dignidades: number }>(
      '/publico/votante/emitir',
      { votos },
      { headers: this._votoHeaders() },
    );
  }

  logout(): void {
    this._setToken(null);
  }
}
