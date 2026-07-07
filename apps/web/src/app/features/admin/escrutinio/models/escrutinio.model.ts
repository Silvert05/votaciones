import { Dignidad, Eleccion } from '../../elections/models/election.model';
import { TipoVoto } from '../../votacion/models/votacion.model';

export type EstadoActaEscrutinio = 'BORRADOR' | 'CERRADA' | 'APROBADA';
export type EstadoImpugnacionResultado = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export interface DetalleActaEscrutinio {
  id: string;
  actaId: string;
  candidaturaId: string | null;
  tipo: TipoVoto;
  opcionKey: string;
  total: number;
  orden: number;
  candidatura: {
    id: string;
    elector: {
      identificacion: string;
      nombres: string;
      apellidos: string;
    };
    lista: {
      codigo: string;
      nombre: string;
      color: string | null;
    } | null;
  } | null;
}

export interface ActaEscrutinio {
  id: string;
  eleccionId: string;
  dignidadId: string;
  numeroActa: string;
  totalPadron: number;
  totalVotantes: number;
  votosValidos: number;
  votosBlancos: number;
  votosNulos: number;
  estado: EstadoActaEscrutinio;
  observacion: string | null;
  cerradaAt: string | null;
  aprobadaAt: string | null;
  createdAt: string;
  updatedAt: string;
  dignidad: Pick<Dignidad, 'id' | 'nombre' | 'cantidadGanadores' | 'orden'>;
  detalles: DetalleActaEscrutinio[];
}

export interface ImpugnacionResultado {
  id: string;
  eleccionId: string;
  dignidadId: string | null;
  actaId: string | null;
  presentadoPor: string;
  fundamento: string;
  estado: EstadoImpugnacionResultado;
  resolucion: string | null;
  fechaPresentacion: string;
  fechaResolucion: string | null;
  createdAt: string;
  updatedAt: string;
  dignidad: Pick<Dignidad, 'id' | 'nombre'> | null;
}

export interface ResultadoFinalDignidad {
  dignidadId: string;
  dignidad: string;
  cantidadGanadores: number;
  actaEstado: EstadoActaEscrutinio;
  totalVotantes: number;
  votosValidos: number;
  votosBlancos: number;
  votosNulos: number;
  ganadores: DetalleActaEscrutinio[];
}

export interface EscrutinioResumen {
  eleccion: Pick<Eleccion, 'id' | 'nombre' | 'estado'>;
  padronHabilitado: number;
  dignidades: Array<Pick<Dignidad, 'id' | 'nombre' | 'cantidadGanadores' | 'orden'>>;
  actas: ActaEscrutinio[];
  impugnaciones: ImpugnacionResultado[];
  resultados: ResultadoFinalDignidad[];
}

export interface ObservacionActaPayload {
  observacion?: string | null;
}

export interface CreateImpugnacionPayload {
  dignidadId?: string | null;
  presentadoPor: string;
  fundamento: string;
}

export interface ResolverImpugnacionPayload {
  estado: Exclude<EstadoImpugnacionResultado, 'PENDIENTE'>;
  resolucion: string;
}
