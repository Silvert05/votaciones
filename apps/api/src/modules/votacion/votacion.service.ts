import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import {
  EstadoCandidatura,
  EstadoEleccion,
  EstadoPadronElector,
  TipoVoto,
} from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import {
  AuditOperacion,
  AuditTabla,
} from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuthUser } from '../auth/entities/auth.entity';
import { EmitirVotoDto, TarjetonQueryDto } from './dto/votacion.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

const candidatoSelect = {
  id: true,
  eleccionId: true,
  dignidadId: true,
  electorId: true,
  listaId: true,
  orden: true,
  estado: true,
  elector: {
    select: {
      id: true,
      identificacion: true,
      nombres: true,
      apellidos: true,
      tipo: true,
    },
  },
  lista: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      color: true,
    },
  },
} satisfies Prisma.CandidaturaSelect;

@Injectable()
export class VotacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async abrirVotacion(eleccionId: string, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado === EstadoEleccion.VOTACION_ABIERTA) {
      return eleccion;
    }
    if (
      eleccion.estado !== EstadoEleccion.CAMPANIA &&
      eleccion.estado !== EstadoEleccion.CANDIDATURAS_CALIFICADAS
    ) {
      throw new BadRequestException(
        'La votacion solo puede abrirse luego de candidaturas calificadas o campania.',
      );
    }

    await this.ensureCandidaturasCalificadas(eleccionId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.eleccion.update({
        where: { id: eleccionId },
        data: { estado: EstadoEleccion.VOTACION_ABIERTA },
      });
      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId,
          estadoAnterior: eleccion.estado,
          estadoNuevo: EstadoEleccion.VOTACION_ABIERTA,
          comentario: 'Apertura de la jornada de votacion',
          usuario: actor.user.usuario,
        },
      });
      return next;
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.ESTADO, eleccionId, {
      datosAnteriores: { estado: eleccion.estado },
      datosNuevos: { estado: updated.estado },
      actor,
    });

    return updated;
  }

  async cerrarVotacion(eleccionId: string, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado !== EstadoEleccion.VOTACION_ABIERTA) {
      throw new BadRequestException('Solo se puede cerrar una votacion abierta.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.eleccion.update({
        where: { id: eleccionId },
        data: { estado: EstadoEleccion.VOTACION_CERRADA },
      });
      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId,
          estadoAnterior: eleccion.estado,
          estadoNuevo: EstadoEleccion.VOTACION_CERRADA,
          comentario: 'Cierre de la jornada de votacion',
          usuario: actor.user.usuario,
        },
      });
      return next;
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.ESTADO, eleccionId, {
      datosAnteriores: { estado: eleccion.estado },
      datosNuevos: { estado: updated.estado },
      actor,
    });

    return updated;
  }

  async tarjeton(eleccionId: string, query: TarjetonQueryDto) {
    const eleccion = await this.getEleccion(eleccionId);
    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        cantidadGanadores: true,
        requiereLista: true,
        tipoElectorPermitido: true,
        candidaturas: {
          where: { estado: EstadoCandidatura.CALIFICADA },
          select: candidatoSelect,
          orderBy: [
            { lista: { codigo: 'asc' } },
            { orden: 'asc' },
            { elector: { apellidos: 'asc' } },
          ],
        },
      },
    });

    let elector: { id: string; identificacion: string } | null = null;
    let votosEmitidos: string[] = [];
    if (query.identificacion) {
      elector = await this.findElectorHabilitado(eleccionId, query.identificacion);
      votosEmitidos = (
        await this.prisma.votoEmitido.findMany({
          where: { eleccionId, electorId: elector.id },
          select: { dignidadId: true },
        })
      ).map((item) => item.dignidadId);
    }

    return {
      eleccion,
      elector,
      dignidades,
      votosEmitidos,
    };
  }

  async emitirVoto(eleccionId: string, dto: EmitirVotoDto, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado !== EstadoEleccion.VOTACION_ABIERTA) {
      throw new BadRequestException('La votacion no esta abierta.');
    }

    const elector = await this.findElectorHabilitado(
      eleccionId,
      dto.identificacion,
    );
    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      select: { id: true, nombre: true },
    });
    if (!dignidades.length) {
      throw new BadRequestException('La eleccion no tiene dignidades activas.');
    }

    const dignidadIds = new Set(dignidades.map((dignidad) => dignidad.id));
    const votosPorDignidad = new Map(dto.votos.map((voto) => [voto.dignidadId, voto]));
    if (votosPorDignidad.size !== dto.votos.length) {
      throw new BadRequestException('Hay dignidades duplicadas en el voto.');
    }
    if (votosPorDignidad.size !== dignidadIds.size) {
      throw new BadRequestException('Debe registrar una seleccion por cada dignidad activa.');
    }

    for (const voto of dto.votos) {
      if (!dignidadIds.has(voto.dignidadId)) {
        throw new BadRequestException('Una dignidad no pertenece a la eleccion.');
      }
      await this.validateSeleccion(eleccionId, voto);
    }

    const yaVoto = await this.prisma.votoEmitido.findFirst({
      where: { eleccionId, electorId: elector.id },
      select: { id: true },
    });
    if (yaVoto) {
      throw new BadRequestException('El elector ya registro su voto en esta eleccion.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const voto of dto.votos) {
        const opcionKey = this.opcionKey(voto.tipo, voto.candidaturaId);
        await tx.votoEmitido.create({
          data: {
            eleccionId,
            dignidadId: voto.dignidadId,
            electorId: elector.id,
          },
        });
        await tx.conteoVoto.upsert({
          where: {
            eleccionId_dignidadId_opcionKey: {
              eleccionId,
              dignidadId: voto.dignidadId,
              opcionKey,
            },
          },
          update: { total: { increment: 1 } },
          create: {
            eleccionId,
            dignidadId: voto.dignidadId,
            candidaturaId:
              voto.tipo === TipoVoto.CANDIDATO ? voto.candidaturaId! : null,
            tipo: voto.tipo,
            opcionKey,
            total: 1,
          },
        });
      }
    });

    await this.audit(AuditTabla.VOTOS_EMITIDOS, AuditOperacion.CREATE, elector.id, {
      datosNuevos: {
        eleccionId,
        electorId: elector.id,
        dignidades: dto.votos.map((voto) => voto.dignidadId),
      },
      actor,
    });

    return { registrado: true, dignidades: dto.votos.length };
  }

  async resultados(eleccionId: string) {
    const eleccion = await this.getEleccion(eleccionId);
    const padronHabilitado = await this.prisma.padronElectoral.count({
      where: {
        eleccionId,
        publicado: true,
        estado: EstadoPadronElector.HABILITADO,
      },
    });
    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true, cantidadGanadores: true },
    });
    const conteos = await this.prisma.conteoVoto.findMany({
      where: { eleccionId },
      orderBy: [{ dignidad: { orden: 'asc' } }, { total: 'desc' }],
      select: {
        id: true,
        eleccionId: true,
        dignidadId: true,
        candidaturaId: true,
        tipo: true,
        opcionKey: true,
        total: true,
        candidatura: {
          select: {
            id: true,
            elector: {
              select: {
                identificacion: true,
                nombres: true,
                apellidos: true,
              },
            },
            lista: {
              select: { codigo: true, nombre: true, color: true },
            },
          },
        },
      },
    });

    const emitidos = await Promise.all(
      dignidades.map(async (dignidad) => ({
        dignidadId: dignidad.id,
        total: await this.prisma.votoEmitido.count({
          where: { eleccionId, dignidadId: dignidad.id },
        }),
      })),
    );

    return {
      eleccion,
      padronHabilitado,
      dignidades,
      emitidos,
      conteos,
    };
  }

  private async getEleccion(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: { id: true, nombre: true, estado: true },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');
    return eleccion;
  }

  private async ensureCandidaturasCalificadas(eleccionId: string) {
    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      select: { id: true, nombre: true },
    });
    if (!dignidades.length) {
      throw new BadRequestException('La eleccion no tiene dignidades activas.');
    }

    const faltantes: string[] = [];
    for (const dignidad of dignidades) {
      const total = await this.prisma.candidatura.count({
        where: {
          eleccionId,
          dignidadId: dignidad.id,
          estado: EstadoCandidatura.CALIFICADA,
        },
      });
      if (!total) faltantes.push(dignidad.nombre);
    }
    if (faltantes.length) {
      throw new BadRequestException(
        `No hay candidaturas calificadas para: ${faltantes.join(', ')}.`,
      );
    }
  }

  private async findElectorHabilitado(eleccionId: string, identificacion: string) {
    const padron = await this.prisma.padronElectoral.findFirst({
      where: {
        eleccionId,
        publicado: true,
        estado: EstadoPadronElector.HABILITADO,
        elector: {
          identificacion: identificacion.trim(),
          activo: true,
        },
      },
      select: {
        elector: {
          select: {
            id: true,
            identificacion: true,
          },
        },
      },
    });
    if (!padron) {
      throw new BadRequestException('El elector no esta habilitado en el padron publicado.');
    }
    return padron.elector;
  }

  private async validateSeleccion(
    eleccionId: string,
    voto: { dignidadId: string; tipo: TipoVoto; candidaturaId?: string | null },
  ) {
    if (voto.tipo === TipoVoto.CANDIDATO) {
      if (!voto.candidaturaId) {
        throw new BadRequestException('El voto por candidato requiere candidatura.');
      }
      const candidatura = await this.prisma.candidatura.findFirst({
        where: {
          id: voto.candidaturaId,
          eleccionId,
          dignidadId: voto.dignidadId,
          estado: EstadoCandidatura.CALIFICADA,
        },
        select: { id: true },
      });
      if (!candidatura) {
        throw new BadRequestException('La candidatura seleccionada no esta calificada.');
      }
      return;
    }

    if (voto.candidaturaId) {
      throw new BadRequestException('El voto blanco o nulo no debe tener candidatura.');
    }
  }

  private opcionKey(tipo: TipoVoto, candidaturaId?: string | null): string {
    if (tipo === TipoVoto.CANDIDATO) return candidaturaId!;
    return tipo;
  }

  private audit(
    tabla: string,
    operacion: string,
    registroId: string,
    params: { datosAnteriores?: unknown; datosNuevos?: unknown; actor: Actor },
  ) {
    return this.auditoria.registrar({
      tabla,
      operacion,
      registroId,
      datosAnteriores: params.datosAnteriores,
      datosNuevos: params.datosNuevos,
      usuario: params.actor.user.usuario,
      ip: params.actor.ip,
    });
  }
}
