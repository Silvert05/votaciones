import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import {
  EstadoActaEscrutinio,
  EstadoCandidatura,
  EstadoEleccion,
  EstadoImpugnacionResultado,
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
import {
  CreateImpugnacionResultadoDto,
  ObservacionActaDto,
  ResolverImpugnacionResultadoDto,
} from './dto/escrutinio.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

type TxClient = Prisma.TransactionClient;

interface DetalleActaGenerado {
  candidaturaId: string | null;
  tipo: TipoVoto;
  opcionKey: string;
  total: number;
  orden: number;
}

const actaSelect = {
  id: true,
  eleccionId: true,
  dignidadId: true,
  numeroActa: true,
  totalPadron: true,
  totalVotantes: true,
  votosValidos: true,
  votosBlancos: true,
  votosNulos: true,
  estado: true,
  observacion: true,
  cerradaAt: true,
  aprobadaAt: true,
  createdAt: true,
  updatedAt: true,
  dignidad: {
    select: {
      id: true,
      nombre: true,
      cantidadGanadores: true,
      orden: true,
    },
  },
  detalles: {
    orderBy: [{ orden: 'asc' }, { total: 'desc' }],
    select: {
      id: true,
      actaId: true,
      candidaturaId: true,
      tipo: true,
      opcionKey: true,
      total: true,
      orden: true,
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
            select: {
              codigo: true,
              nombre: true,
              color: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ActaEscrutinioSelect;

const impugnacionSelect = {
  id: true,
  eleccionId: true,
  dignidadId: true,
  actaId: true,
  presentadoPor: true,
  fundamento: true,
  estado: true,
  resolucion: true,
  fechaPresentacion: true,
  fechaResolucion: true,
  createdAt: true,
  updatedAt: true,
  dignidad: {
    select: {
      id: true,
      nombre: true,
    },
  },
} satisfies Prisma.ImpugnacionResultadoSelect;

@Injectable()
export class EscrutinioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async resumen(eleccionId: string) {
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
      select: {
        id: true,
        nombre: true,
        cantidadGanadores: true,
        orden: true,
      },
    });
    const actas = await this.prisma.actaEscrutinio.findMany({
      where: { eleccionId },
      orderBy: [{ dignidad: { orden: 'asc' } }, { numeroActa: 'asc' }],
      select: actaSelect,
    });
    const impugnaciones = await this.prisma.impugnacionResultado.findMany({
      where: { eleccionId },
      orderBy: { fechaPresentacion: 'desc' },
      select: impugnacionSelect,
    });

    return {
      eleccion,
      padronHabilitado,
      dignidades,
      actas,
      impugnaciones,
      resultados: this.buildResultados(actas),
    };
  }

  async generarActas(eleccionId: string, actor: Actor) {
    const before = await this.getEleccion(eleccionId);
    if (
      before.estado !== EstadoEleccion.VOTACION_CERRADA &&
      before.estado !== EstadoEleccion.ESCRUTINIO
    ) {
      throw new BadRequestException(
        'Las actas solo se generan con la votacion cerrada o en escrutinio.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const dignidades = await tx.dignidad.findMany({
        where: { eleccionId, activo: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: {
          id: true,
          nombre: true,
          orden: true,
        },
      });
      if (!dignidades.length) {
        throw new BadRequestException('La eleccion no tiene dignidades activas.');
      }

      const totalPadron = await tx.padronElectoral.count({
        where: {
          eleccionId,
          publicado: true,
          estado: EstadoPadronElector.HABILITADO,
        },
      });

      const actasProcesadas: string[] = [];
      for (const [index, dignidad] of dignidades.entries()) {
        const detalle = await this.buildDetalleActa(tx, eleccionId, dignidad.id);
        const totalVotantes = await tx.votoEmitido.count({
          where: { eleccionId, dignidadId: dignidad.id },
        });
        const votosValidos = detalle
          .filter((item) => item.tipo === TipoVoto.CANDIDATO)
          .reduce((sum, item) => sum + item.total, 0);
        const votosBlancos =
          detalle.find((item) => item.tipo === TipoVoto.BLANCO)?.total ?? 0;
        const votosNulos =
          detalle.find((item) => item.tipo === TipoVoto.NULO)?.total ?? 0;

        const existing = await tx.actaEscrutinio.findUnique({
          where: {
            eleccionId_dignidadId: {
              eleccionId,
              dignidadId: dignidad.id,
            },
          },
          select: { id: true, estado: true },
        });

        if (existing && existing.estado !== EstadoActaEscrutinio.BORRADOR) {
          actasProcesadas.push(existing.id);
          continue;
        }

        const acta = existing
          ? await tx.actaEscrutinio.update({
              where: { id: existing.id },
              data: {
                totalPadron,
                totalVotantes,
                votosValidos,
                votosBlancos,
                votosNulos,
              },
              select: { id: true },
            })
          : await tx.actaEscrutinio.create({
              data: {
                eleccionId,
                dignidadId: dignidad.id,
                numeroActa: this.numeroActa(eleccionId, index),
                totalPadron,
                totalVotantes,
                votosValidos,
                votosBlancos,
                votosNulos,
              },
              select: { id: true },
            });

        await tx.detalleActaEscrutinio.deleteMany({
          where: { actaId: acta.id },
        });
        await tx.detalleActaEscrutinio.createMany({
          data: detalle.map((item) => ({
            actaId: acta.id,
            candidaturaId: item.candidaturaId,
            tipo: item.tipo,
            opcionKey: item.opcionKey,
            total: item.total,
            orden: item.orden,
          })),
        });
        actasProcesadas.push(acta.id);
      }

      if (before.estado === EstadoEleccion.VOTACION_CERRADA) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.ESCRUTINIO },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: before.estado,
            estadoNuevo: EstadoEleccion.ESCRUTINIO,
            comentario: 'Inicio de escrutinio y generacion de actas',
            usuario: actor.user.usuario,
          },
        });
      }

      return actasProcesadas;
    });

    await this.audit(AuditTabla.ACTAS_ESCRUTINIO, AuditOperacion.CREATE, eleccionId, {
      datosNuevos: { actas: result.length },
      actor,
    });

    return this.resumen(eleccionId);
  }

  async cerrarActa(actaId: string, dto: ObservacionActaDto, actor: Actor) {
    const acta = await this.findActa(actaId);
    if (acta.estado !== EstadoActaEscrutinio.BORRADOR) {
      throw new BadRequestException('Solo se puede cerrar un acta en borrador.');
    }

    const updated = await this.prisma.actaEscrutinio.update({
      where: { id: actaId },
      data: {
        estado: EstadoActaEscrutinio.CERRADA,
        observacion: this.emptyToNull(dto.observacion) ?? acta.observacion,
        cerradaAt: new Date(),
      },
      select: actaSelect,
    });

    await this.audit(AuditTabla.ACTAS_ESCRUTINIO, AuditOperacion.ESTADO, actaId, {
      datosAnteriores: { estado: acta.estado },
      datosNuevos: { estado: updated.estado },
      actor,
    });

    return updated;
  }

  async aprobarActa(actaId: string, dto: ObservacionActaDto, actor: Actor) {
    const acta = await this.findActa(actaId);
    if (acta.estado !== EstadoActaEscrutinio.CERRADA) {
      throw new BadRequestException('Solo se puede aprobar un acta cerrada.');
    }

    const updated = await this.prisma.actaEscrutinio.update({
      where: { id: actaId },
      data: {
        estado: EstadoActaEscrutinio.APROBADA,
        observacion: this.emptyToNull(dto.observacion) ?? acta.observacion,
        aprobadaAt: new Date(),
      },
      select: actaSelect,
    });

    await this.audit(AuditTabla.ACTAS_ESCRUTINIO, AuditOperacion.ESTADO, actaId, {
      datosAnteriores: { estado: acta.estado },
      datosNuevos: { estado: updated.estado },
      actor,
    });

    return updated;
  }

  async publicarProvisionales(eleccionId: string, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado === EstadoEleccion.RESULTADOS_PROVISIONALES) {
      return this.resumen(eleccionId);
    }
    if (eleccion.estado !== EstadoEleccion.ESCRUTINIO) {
      throw new BadRequestException(
        'Los resultados provisionales solo se publican desde escrutinio.',
      );
    }

    await this.ensureActasAprobadas(eleccionId);
    await this.cambiarEstado(
      eleccionId,
      eleccion.estado,
      EstadoEleccion.RESULTADOS_PROVISIONALES,
      'Publicacion de resultados provisionales',
      actor,
    );
    return this.resumen(eleccionId);
  }

  async crearImpugnacion(
    eleccionId: string,
    dto: CreateImpugnacionResultadoDto,
    actor: Actor,
  ) {
    const eleccion = await this.getEleccion(eleccionId);
    if (
      eleccion.estado !== EstadoEleccion.RESULTADOS_PROVISIONALES &&
      eleccion.estado !== EstadoEleccion.IMPUGNACION_RESULTADOS
    ) {
      throw new BadRequestException(
        'Las impugnaciones se registran despues de publicar resultados provisionales.',
      );
    }

    const dignidadId = this.emptyToNull(dto.dignidadId);
    let actaId: string | null = null;
    if (dignidadId) {
      const acta = await this.prisma.actaEscrutinio.findUnique({
        where: {
          eleccionId_dignidadId: {
            eleccionId,
            dignidadId,
          },
        },
        select: { id: true },
      });
      if (!acta) {
        throw new BadRequestException('La dignidad no tiene acta de escrutinio.');
      }
      actaId = acta.id;
    }

    const impugnacion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.impugnacionResultado.create({
        data: {
          eleccionId,
          dignidadId,
          actaId,
          presentadoPor: dto.presentadoPor.trim(),
          fundamento: dto.fundamento.trim(),
        },
        select: impugnacionSelect,
      });

      if (eleccion.estado === EstadoEleccion.RESULTADOS_PROVISIONALES) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.IMPUGNACION_RESULTADOS },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.IMPUGNACION_RESULTADOS,
            comentario: 'Registro de impugnacion de resultados',
            usuario: actor.user.usuario,
          },
        });
      }

      return created;
    });

    await this.audit(
      AuditTabla.IMPUGNACIONES_RESULTADOS,
      AuditOperacion.CREATE,
      impugnacion.id,
      {
        datosNuevos: impugnacion,
        actor,
      },
    );

    return impugnacion;
  }

  async resolverImpugnacion(
    impugnacionId: string,
    dto: ResolverImpugnacionResultadoDto,
    actor: Actor,
  ) {
    if (dto.estado === EstadoImpugnacionResultado.PENDIENTE) {
      throw new BadRequestException('La resolucion debe aceptar o rechazar la impugnacion.');
    }

    const before = await this.prisma.impugnacionResultado.findUnique({
      where: { id: impugnacionId },
      select: impugnacionSelect,
    });
    if (!before) {
      throw new NotFoundException('Impugnacion no encontrada.');
    }

    const updated = await this.prisma.impugnacionResultado.update({
      where: { id: impugnacionId },
      data: {
        estado: dto.estado,
        resolucion: dto.resolucion.trim(),
        fechaResolucion: new Date(),
      },
      select: impugnacionSelect,
    });

    await this.audit(
      AuditTabla.IMPUGNACIONES_RESULTADOS,
      AuditOperacion.ESTADO,
      impugnacionId,
      {
        datosAnteriores: { estado: before.estado },
        datosNuevos: { estado: updated.estado, resolucion: updated.resolucion },
        actor,
      },
    );

    return updated;
  }

  async publicarDefinitivos(eleccionId: string, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado === EstadoEleccion.RESULTADOS_DEFINITIVOS) {
      return this.resumen(eleccionId);
    }
    if (
      eleccion.estado !== EstadoEleccion.RESULTADOS_PROVISIONALES &&
      eleccion.estado !== EstadoEleccion.IMPUGNACION_RESULTADOS
    ) {
      throw new BadRequestException(
        'Los resultados definitivos requieren resultados provisionales publicados.',
      );
    }

    await this.ensureActasAprobadas(eleccionId);
    const pendientes = await this.prisma.impugnacionResultado.count({
      where: { eleccionId, estado: EstadoImpugnacionResultado.PENDIENTE },
    });
    if (pendientes) {
      throw new BadRequestException(
        'No se pueden publicar definitivos con impugnaciones pendientes.',
      );
    }

    await this.cambiarEstado(
      eleccionId,
      eleccion.estado,
      EstadoEleccion.RESULTADOS_DEFINITIVOS,
      'Publicacion de resultados definitivos',
      actor,
    );
    return this.resumen(eleccionId);
  }

  private async buildDetalleActa(
    tx: TxClient,
    eleccionId: string,
    dignidadId: string,
  ): Promise<DetalleActaGenerado[]> {
    const [conteos, candidaturas] = await Promise.all([
      tx.conteoVoto.findMany({
        where: { eleccionId, dignidadId },
        select: { opcionKey: true, tipo: true, total: true },
      }),
      tx.candidatura.findMany({
        where: {
          eleccionId,
          dignidadId,
          estado: EstadoCandidatura.CALIFICADA,
        },
        orderBy: [
          { orden: 'asc' },
          { lista: { codigo: 'asc' } },
          { elector: { apellidos: 'asc' } },
        ],
        select: { id: true },
      }),
    ]);
    const conteoPorOpcion = new Map(
      conteos.map((conteo) => [conteo.opcionKey, conteo.total]),
    );

    const detalles: DetalleActaGenerado[] = candidaturas.map((candidatura, index) => ({
      candidaturaId: candidatura.id,
      tipo: TipoVoto.CANDIDATO,
      opcionKey: candidatura.id,
      total: conteoPorOpcion.get(candidatura.id) ?? 0,
      orden: index + 1,
    }));

    detalles.push({
      candidaturaId: null,
      tipo: TipoVoto.BLANCO,
      opcionKey: TipoVoto.BLANCO,
      total: conteoPorOpcion.get(TipoVoto.BLANCO) ?? 0,
      orden: 9000,
    });
    detalles.push({
      candidaturaId: null,
      tipo: TipoVoto.NULO,
      opcionKey: TipoVoto.NULO,
      total: conteoPorOpcion.get(TipoVoto.NULO) ?? 0,
      orden: 9001,
    });

    return detalles;
  }

  private async ensureActasAprobadas(eleccionId: string) {
    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      select: { id: true, nombre: true },
    });
    if (!dignidades.length) {
      throw new BadRequestException('La eleccion no tiene dignidades activas.');
    }

    const actas = await this.prisma.actaEscrutinio.findMany({
      where: { eleccionId },
      select: { dignidadId: true, estado: true },
    });
    const actasPorDignidad = new Map(
      actas.map((acta) => [acta.dignidadId, acta.estado]),
    );
    const faltantes = dignidades.filter(
      (dignidad) =>
        actasPorDignidad.get(dignidad.id) !== EstadoActaEscrutinio.APROBADA,
    );
    if (faltantes.length) {
      throw new BadRequestException(
        `Faltan actas aprobadas para: ${faltantes
          .map((dignidad) => dignidad.nombre)
          .join(', ')}.`,
      );
    }
  }

  private buildResultados(
    actas: Array<Prisma.ActaEscrutinioGetPayload<{ select: typeof actaSelect }>>,
  ) {
    return actas.map((acta) => {
      const candidatos = acta.detalles
        .filter((detalle) => detalle.tipo === TipoVoto.CANDIDATO)
        .sort((a, b) => b.total - a.total || a.orden - b.orden);
      const ganadores = candidatos.slice(0, acta.dignidad.cantidadGanadores);
      return {
        dignidadId: acta.dignidadId,
        dignidad: acta.dignidad.nombre,
        cantidadGanadores: acta.dignidad.cantidadGanadores,
        actaEstado: acta.estado,
        totalVotantes: acta.totalVotantes,
        votosValidos: acta.votosValidos,
        votosBlancos: acta.votosBlancos,
        votosNulos: acta.votosNulos,
        ganadores,
      };
    });
  }

  private async cambiarEstado(
    eleccionId: string,
    estadoAnterior: EstadoEleccion,
    estadoNuevo: EstadoEleccion,
    comentario: string,
    actor: Actor,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.eleccion.update({
        where: { id: eleccionId },
        data: { estado: estadoNuevo },
      });
      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId,
          estadoAnterior,
          estadoNuevo,
          comentario,
          usuario: actor.user.usuario,
        },
      });
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.ESTADO, eleccionId, {
      datosAnteriores: { estado: estadoAnterior },
      datosNuevos: { estado: estadoNuevo },
      actor,
    });
  }

  private async findActa(actaId: string) {
    const acta = await this.prisma.actaEscrutinio.findUnique({
      where: { id: actaId },
      select: actaSelect,
    });
    if (!acta) {
      throw new NotFoundException('Acta de escrutinio no encontrada.');
    }
    return acta;
  }

  private async getEleccion(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: { id: true, nombre: true, estado: true },
    });
    if (!eleccion) {
      throw new NotFoundException('Eleccion no encontrada.');
    }
    return eleccion;
  }

  private numeroActa(eleccionId: string, orden: number): string {
    return `ACT-${eleccionId.slice(0, 8).toUpperCase()}-${String(orden + 1).padStart(3, '0')}`;
  }

  private emptyToNull(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
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
