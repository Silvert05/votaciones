import { Dignidad, Eleccion } from '../../elections/models/election.model';
import { Elector } from '../../padron/models/padron.model';

export type TipoVoto = 'CANDIDATO' | 'BLANCO' | 'NULO';

export interface CandidatoTarjeton {
  id: string;
  eleccionId: string;
  dignidadId: string;
  electorId: string;
  listaId: string | null;
  orden: number;
  estado: string;
  elector: Pick<
    Elector,
    'id' | 'identificacion' | 'nombres' | 'apellidos' | 'tipo'
  >;
  lista: {
    id: string;
    codigo: string;
    nombre: string;
    color: string | null;
  } | null;
}

export interface DignidadTarjeton
  extends Pick<
    Dignidad,
    | 'id'
    | 'nombre'
    | 'descripcion'
    | 'cantidadGanadores'
    | 'requiereLista'
    | 'tipoElectorPermitido'
  > {
  candidaturas: CandidatoTarjeton[];
}

export interface TarjetonResponse {
  eleccion: Pick<Eleccion, 'id' | 'nombre' | 'estado'>;
  elector: { id: string; identificacion: string } | null;
  dignidades: DignidadTarjeton[];
  votosEmitidos: string[];
}

export interface VotoSeleccionPayload {
  dignidadId: string;
  tipo: TipoVoto;
  candidaturaId?: string | null;
}

export interface EmitirVotoPayload {
  identificacion: string;
  votos: VotoSeleccionPayload[];
}

export interface ConteoVoto {
  id: string;
  eleccionId: string;
  dignidadId: string;
  candidaturaId: string | null;
  tipo: TipoVoto;
  opcionKey: string;
  total: number;
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

export interface ResultadoDignidad {
  dignidadId: string;
  total: number;
}

export interface ResultadosResponse {
  eleccion: Pick<Eleccion, 'id' | 'nombre' | 'estado'>;
  padronHabilitado: number;
  dignidades: Array<Pick<Dignidad, 'id' | 'nombre' | 'cantidadGanadores'>>;
  emitidos: ResultadoDignidad[];
  conteos: ConteoVoto[];
}
