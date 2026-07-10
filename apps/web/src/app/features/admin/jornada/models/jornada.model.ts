export interface JornadaEvento {
  id: string;
  jornadaId: string;
  paso:
    | 'INICIALIZACION'
    | 'PUESTA_A_CERO'
    | 'INICIO_VOTACION'
    | 'CIERRE_VOTACION'
    | 'RESULTADOS';
  reporte: string | null;
  usuario: string | null;
  createdAt: string;
}

export interface Jornada {
  id: string;
  eleccionId: string;
  configBloqueada: boolean;
  inicializadaAt: string | null;
  puestaCeroAt: string | null;
  votacionIniciadaAt: string | null;
  votacionCerradaAt: string | null;
  resultadosAt: string | null;
  fechaFinVotacion: string | null;
  linkVotacionActivo: boolean;
  createdAt: string;
  updatedAt: string;
  eventos: JornadaEvento[];
}

export interface JornadaEstado {
  eleccion: {
    id: string;
    nombre: string;
    tipo: string;
    estado: string;
    institucion: string | null;
  };
  jornada: Jornada;
  pasoActual: number;
  resumen: {
    padronHabilitado: number;
    votosEmitidos: number;
    dignidades: number;
  };
}

export interface PasoPayload {
  reporte?: string;
}

export interface IniciarVotacionPayload extends PasoPayload {
  fechaFinVotacion?: string;
}
