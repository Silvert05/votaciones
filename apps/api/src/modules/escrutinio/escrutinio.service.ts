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
  IniciarSegundaVueltaDto,
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
  vuelta: true,
  empatado: true,
  empateCandidaturaIds: true,
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
      vuelta: true,
      pausadaSegundaVuelta: true,
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
  respaldoIdentificaciones: true,
  respaldoValidos: true,
  estado: true,
  resolucion: true,
  fechaPresentacion: true,
  fechaLimiteResolucion: true,
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
        vuelta: true,
        pausadaSegundaVuelta: true,
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
          vuelta: true,
          cantidadGanadores: true,
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
        const { empatado, empatadosIds } = this.detectarEmpate(
          detalle,
          dignidad.cantidadGanadores,
        );

        const existing = await tx.actaEscrutinio.findUnique({
          where: {
            eleccionId_dignidadId_vuelta: {
              eleccionId,
              dignidadId: dignidad.id,
              vuelta: dignidad.vuelta,
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
                empatado,
                empateCandidaturaIds: empatadosIds,
              },
              select: { id: true },
            })
          : await tx.actaEscrutinio.create({
              data: {
                eleccionId,
                dignidadId: dignidad.id,
                numeroActa: this.numeroActa(eleccionId, index, dignidad.vuelta),
                vuelta: dignidad.vuelta,
                totalPadron,
                totalVotantes,
                votosValidos,
                votosBlancos,
                votosNulos,
                empatado,
                empateCandidaturaIds: empatadosIds,
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

    await this.reactivarDignidadesPausadas(eleccionId);
    await this.ensureActasAprobadas(eleccionId);
    await this.ensureSinEmpatesPendientes(eleccionId);
    await this.cambiarEstado(
      eleccionId,
      eleccion.estado,
      EstadoEleccion.RESULTADOS_PROVISIONALES,
      'Publicacion de resultados provisionales',
      actor,
    );
    return this.resumen(eleccionId);
  }

  async iniciarSegundaVuelta(
    eleccionId: string,
    dignidadId: string,
    dto: IniciarSegundaVueltaDto,
    actor: Actor,
  ) {
    const eleccion = await this.getEleccion(eleccionId);
    const dignidad = await this.prisma.dignidad.findFirst({
      where: { id: dignidadId, eleccionId },
      select: { id: true, nombre: true, vuelta: true, activo: true },
    });
    if (!dignidad) {
      throw new NotFoundException('Dignidad no encontrada en esta eleccion.');
    }

    const acta = await this.prisma.actaEscrutinio.findUnique({
      where: {
        eleccionId_dignidadId_vuelta: {
          eleccionId,
          dignidadId,
          vuelta: dignidad.vuelta,
        },
      },
      select: { id: true, estado: true, empatado: true, empateCandidaturaIds: true },
    });
    if (!acta || acta.estado !== EstadoActaEscrutinio.APROBADA) {
      throw new BadRequestException(
        'Solo se puede iniciar una segunda vuelta desde un acta aprobada.',
      );
    }
    if (!acta.empatado || !acta.empateCandidaturaIds.length) {
      throw new BadRequestException(
        'Esta dignidad no presenta un empate que requiera segunda vuelta.',
      );
    }

    const plazoHoras = dto.plazoHoras ?? 72;
    const fechaFinVotacion = new Date(Date.now() + plazoHoras * 60 * 60 * 1000);
    const empatadosIds = acta.empateCandidaturaIds;

    await this.prisma.$transaction(async (tx) => {
      await tx.candidatura.updateMany({
        where: {
          eleccionId,
          dignidadId,
          estado: EstadoCandidatura.CALIFICADA,
          id: { notIn: empatadosIds },
        },
        data: { excluidaSegundaVuelta: true },
      });

      await tx.votoEmitido.deleteMany({ where: { eleccionId, dignidadId } });
      await tx.conteoVoto.deleteMany({ where: { eleccionId, dignidadId } });
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "conteos_votos_carrera"
        WHERE "eleccion_id" = ${eleccionId}::uuid AND "dignidad_id" = ${dignidadId}::uuid
      `);

      await tx.dignidad.update({
        where: { id: dignidadId },
        data: { vuelta: { increment: 1 } },
      });

      await tx.dignidad.updateMany({
        where: { eleccionId, id: { not: dignidadId }, activo: true },
        data: { activo: false, pausadaSegundaVuelta: true },
      });

      await tx.jornadaElectoral.update({
        where: { eleccionId },
        data: { linkVotacionActivo: true, fechaFinVotacion },
      });

      if (
        eleccion.estado !== EstadoEleccion.VOTACION_ABIERTA
      ) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.VOTACION_ABIERTA },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.VOTACION_ABIERTA,
            comentario: `Reapertura de votacion para segunda vuelta (Art. 18) en dignidad "${dignidad.nombre}"`,
            usuario: actor.user.usuario,
          },
        });
      }
    });

    await this.audit(
      AuditTabla.ACTAS_ESCRUTINIO,
      AuditOperacion.ESTADO,
      dignidadId,
      {
        datosAnteriores: { vuelta: dignidad.vuelta, empatadosIds },
        datosNuevos: { vuelta: dignidad.vuelta + 1, fechaFinVotacion },
        actor,
      },
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

    const proclamacion = await this.prisma.historialEstadoEleccion.findFirst({
      where: { eleccionId, estadoNuevo: EstadoEleccion.RESULTADOS_PROVISIONALES },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (proclamacion) {
      const limiteImpugnacion = new Date(
        proclamacion.createdAt.getTime() + 24 * 60 * 60 * 1000,
      );
      if (new Date() > limiteImpugnacion) {
        throw new BadRequestException(
          'El plazo de 24 horas para impugnar los resultados provisionales (Art. 19) ya vencio.',
        );
      }
    }

    const identificaciones = [
      ...new Set(
        dto.respaldoIdentificaciones
          .map((identificacion) => identificacion.trim())
          .filter(Boolean),
      ),
    ];
    const padronHabilitado = await this.prisma.padronElectoral.count({
      where: {
        eleccionId,
        publicado: true,
        estado: EstadoPadronElector.HABILITADO,
      },
    });
    const respaldoValidos = await this.prisma.padronElectoral.count({
      where: {
        eleccionId,
        publicado: true,
        estado: EstadoPadronElector.HABILITADO,
        elector: { identificacion: { in: identificaciones } },
      },
    });
    const minimoRequerido = Math.ceil(padronHabilitado * 0.1);
    if (respaldoValidos < minimoRequerido) {
      throw new BadRequestException(
        `La impugnacion requiere el respaldo de al menos el 10% del padron electoral (Art. 19): ${minimoRequerido} electores habilitados. Se identificaron ${respaldoValidos} validos.`,
      );
    }

    const dignidadId = this.emptyToNull(dto.dignidadId);
    let actaId: string | null = null;
    if (dignidadId) {
      const dignidad = await this.prisma.dignidad.findUnique({
        where: { id: dignidadId },
        select: { vuelta: true },
      });
      if (!dignidad) {
        throw new BadRequestException('La dignidad no existe.');
      }
      const acta = await this.prisma.actaEscrutinio.findUnique({
        where: {
          eleccionId_dignidadId_vuelta: {
            eleccionId,
            dignidadId,
            vuelta: dignidad.vuelta,
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
          respaldoIdentificaciones: identificaciones,
          respaldoValidos,
          fechaLimiteResolucion: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
    await this.ensureSinEmpatesPendientes(eleccionId);
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

  private async ensureSinEmpatesPendientes(eleccionId: string) {
    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      select: { id: true, nombre: true, vuelta: true },
    });
    const actas = await this.prisma.actaEscrutinio.findMany({
      where: { eleccionId },
      select: { dignidadId: true, vuelta: true, empatado: true },
    });
    const empatadas = dignidades.filter((dignidad) =>
      actas.some(
        (acta) =>
          acta.dignidadId === dignidad.id &&
          acta.vuelta === dignidad.vuelta &&
          acta.empatado,
      ),
    );
    if (empatadas.length) {
      throw new BadRequestException(
        `Existe empate sin resolver (Art. 18) en: ${empatadas
          .map((dignidad) => dignidad.nombre)
          .join(', ')}. Inicie la segunda vuelta antes de publicar resultados.`,
      );
    }
  }

  private async reactivarDignidadesPausadas(eleccionId: string) {
    const hayPausadas = await this.prisma.dignidad.findFirst({
      where: { eleccionId, pausadaSegundaVuelta: true },
      select: { id: true },
    });
    if (!hayPausadas) return;

    const activas = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      select: { id: true, vuelta: true },
    });
    const actas = await this.prisma.actaEscrutinio.findMany({
      where: { eleccionId },
      select: { dignidadId: true, vuelta: true, empatado: true },
    });
    const algunaPendiente = activas.some((dignidad) =>
      actas.some(
        (acta) =>
          acta.dignidadId === dignidad.id &&
          acta.vuelta === dignidad.vuelta &&
          acta.empatado,
      ),
    );
    if (algunaPendiente) return;

    await this.prisma.dignidad.updateMany({
      where: { eleccionId, pausadaSegundaVuelta: true },
      data: { activo: true, pausadaSegundaVuelta: false },
    });
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
        vuelta: acta.vuelta,
        empatado: acta.empatado,
        empateCandidaturaIds: acta.empateCandidaturaIds,
        esVigente: acta.vuelta === acta.dignidad.vuelta,
        ganadores: acta.empatado ? [] : ganadores,
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

  private numeroActa(
    eleccionId: string,
    orden: number,
    vuelta = 1,
  ): string {
    const base = `ACT-${eleccionId.slice(0, 8).toUpperCase()}-${String(orden + 1).padStart(3, '0')}`;
    return vuelta > 1 ? `${base}-V${vuelta}` : base;
  }

  /**
   * Art. 18: si dos o mas candidaturas empatan en el limite de puestos
   * ganadores de una dignidad, se requiere una segunda votacion entre ellas.
   */
  private detectarEmpate(
    detalle: DetalleActaGenerado[],
    cantidadGanadores: number,
  ): { empatado: boolean; empatadosIds: string[] } {
    const candidatos = detalle
      .filter((item) => item.tipo === TipoVoto.CANDIDATO)
      .sort((a, b) => b.total - a.total);
    if (candidatos.length <= cantidadGanadores) {
      return { empatado: false, empatadosIds: [] };
    }
    const totalLimite = candidatos[cantidadGanadores - 1]?.total ?? 0;
    const totalSiguiente = candidatos[cantidadGanadores]?.total ?? -1;
    if (totalLimite <= 0 || totalLimite !== totalSiguiente) {
      return { empatado: false, empatadosIds: [] };
    }
    const empatadosIds = candidatos
      .filter((item) => item.total === totalLimite)
      .map((item) => item.candidaturaId!)
      .filter((id): id is string => Boolean(id));
    return { empatado: true, empatadosIds };
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
