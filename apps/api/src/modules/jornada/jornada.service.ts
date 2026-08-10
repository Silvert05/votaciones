import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { EstadoEleccion, EstadoPadronElector } from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import { AuditOperacion, AuditTabla } from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuthUser } from '../auth/entities/auth.entity';
import {
  IniciarVotacionDto,
  PasoJornadaDto,
  ReiniciarJornadaDto,
} from './dto/jornada.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

@Injectable()
export class JornadaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async obtenerEstado(eleccionId: string) {
    const eleccion = await this.getEleccion(eleccionId);
    const jornada = await this.ensureJornada(eleccionId);

    const [credenciales, votosEmitidos, dignidades] = await Promise.all([
      this.obtenerResumenCredenciales(eleccionId),
      this.prisma.votoEmitido.count({ where: { eleccionId } }),
      this.prisma.dignidad.count({ where: { eleccionId, activo: true } }),
    ]);

    return {
      eleccion: {
        id: eleccion.id,
        nombre: eleccion.nombre,
        tipo: eleccion.tipo,
        estado: eleccion.estado,
        institucion: eleccion.configuracion?.nombreInstitucion ?? null,
      },
      cronograma: eleccion.cronograma,
      jornada,
      pasoActual: this.pasoActual(jornada),
      resumen: { ...credenciales, votosEmitidos, dignidades },
    };
  }

  async inicializar(eleccionId: string, dto: PasoJornadaDto, actor: Actor) {
    const jornada = await this.ensureJornada(eleccionId);
    if (jornada.inicializadaAt) return this.obtenerEstado(eleccionId);

    const [padron, calificadas] = await Promise.all([
      this.prisma.padronElectoral.count({
        where: {
          eleccionId,
          publicado: true,
          estado: EstadoPadronElector.HABILITADO,
        },
      }),
      this.prisma.candidatura.count({
        where: { eleccionId, estado: 'CALIFICADA' },
      }),
    ]);
    if (!padron) {
      throw new BadRequestException(
        'No se puede inicializar: el padron no esta publicado con electores habilitados.',
      );
    }
    if (!calificadas) {
      throw new BadRequestException(
        'No se puede inicializar: no hay candidaturas calificadas.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.jornadaElectoral.update({
        where: { id: jornada.id },
        data: { inicializadaAt: new Date(), configBloqueada: true },
      });
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          paso: 'INICIALIZACION',
          reporte: dto.reporte ?? 'Jornada inicializada.',
          usuario: actor.user.usuario,
        },
      });
    });

    await this.audit(eleccionId, 'INICIALIZACION', actor);
    return this.obtenerEstado(eleccionId);
  }

  async puestaCero(eleccionId: string, dto: PasoJornadaDto, actor: Actor) {
    const jornada = await this.ensureJornada(eleccionId);
    if (!jornada.inicializadaAt) {
      throw new BadRequestException('Primero debe inicializar la jornada.');
    }

    const votos = await this.prisma.votoEmitido.count({ where: { eleccionId } });
    if (votos > 0) {
      throw new BadRequestException(
        `La puesta a cero fallo: existen ${votos} votos previos registrados.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.jornadaElectoral.update({
        where: { id: jornada.id },
        data: { puestaCeroAt: new Date() },
      });
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          paso: 'PUESTA_A_CERO',
          reporte: dto.reporte ?? 'Puesta a cero verificada: 0 votos.',
          usuario: actor.user.usuario,
        },
      });
    });

    await this.audit(eleccionId, 'PUESTA_A_CERO', actor);
    return this.obtenerEstado(eleccionId);
  }

  async iniciarVotacion(
    eleccionId: string,
    dto: IniciarVotacionDto,
    actor: Actor,
  ) {
    const jornada = await this.ensureJornada(eleccionId);
    if (!jornada.puestaCeroAt) {
      throw new BadRequestException(
        'Primero debe completar la puesta a cero.',
      );
    }

    const credenciales = await this.obtenerResumenCredenciales(eleccionId);
    if (!credenciales.padronHabilitado) {
      throw new BadRequestException(
        'No se puede iniciar la votacion: no existen electores habilitados en el padron publicado.',
      );
    }
    if (credenciales.correosInvalidos > 0) {
      throw new BadRequestException(
        `No se puede iniciar la votacion: ${credenciales.correosInvalidos} elector(es) no tienen un correo institucional @yavirac.edu.ec valido.`,
      );
    }
    if (credenciales.credencialesPendientes > 0) {
      throw new BadRequestException(
        `No se puede iniciar la votacion: faltan generar y enviar ${credenciales.credencialesPendientes} credencial(es). Use "Generar y enviar credenciales".`,
      );
    }

    const eleccion = await this.getEleccion(eleccionId);
    const fechaInicio = eleccion.cronograma?.fechaInicioVotacion;
    const fechaFin = eleccion.cronograma?.fechaFinVotacion;
    if (!fechaInicio || !fechaFin) {
      throw new BadRequestException(
        'Configure las fechas de inicio y cierre en el cronograma antes de iniciar la votacion.',
      );
    }
    const now = new Date();
    if (!dto.forzar && now < fechaInicio) {
      throw new BadRequestException(
        `La votacion se habilitara automaticamente desde ${fechaInicio.toLocaleString('es-EC')}.`,
      );
    }
    if (now >= fechaFin) {
      throw new BadRequestException(
        'La fecha de cierre configurada en el cronograma ya finalizo.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (eleccion.estado !== EstadoEleccion.VOTACION_ABIERTA) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.VOTACION_ABIERTA },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.VOTACION_ABIERTA,
            comentario: 'Inicio de votacion desde la jornada electoral.',
            usuario: actor.user.usuario,
          },
        });
      }
      await tx.jornadaElectoral.update({
        where: { id: jornada.id },
        data: {
          votacionIniciadaAt: new Date(),
          linkVotacionActivo: true,
          fechaFinVotacion: fechaFin,
        },
      });
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          paso: 'INICIO_VOTACION',
          reporte: dto.reporte ?? 'Votacion iniciada. Link habilitado.',
          usuario: actor.user.usuario,
        },
      });
    });

    await this.audit(eleccionId, 'INICIO_VOTACION', actor);
    return this.obtenerEstado(eleccionId);
  }

  async cerrarVotacion(eleccionId: string, dto: PasoJornadaDto, actor: Actor) {
    const jornada = await this.ensureJornada(eleccionId);
    if (!jornada.votacionIniciadaAt) {
      throw new BadRequestException('La votacion no ha sido iniciada.');
    }
    if (jornada.votacionCerradaAt) return this.obtenerEstado(eleccionId);

    const eleccion = await this.getEleccion(eleccionId);
    const fechaFin = eleccion.cronograma?.fechaFinVotacion;
    if (!fechaFin) {
      throw new BadRequestException(
        'Configure la fecha de cierre en el cronograma.',
      );
    }
    if (!dto.forzar && new Date() < fechaFin) {
      throw new BadRequestException(
        `La votacion permanecera abierta hasta ${fechaFin.toLocaleString('es-EC')}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (eleccion.estado === EstadoEleccion.VOTACION_ABIERTA) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.VOTACION_CERRADA },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.VOTACION_CERRADA,
            comentario: 'Cierre de votacion desde la jornada electoral.',
            usuario: actor.user.usuario,
          },
        });
      }
      await tx.jornadaElectoral.update({
        where: { id: jornada.id },
        data: { votacionCerradaAt: new Date(), linkVotacionActivo: false },
      });
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          paso: 'CIERRE_VOTACION',
          reporte: dto.reporte ?? 'Votacion cerrada.',
          usuario: actor.user.usuario,
        },
      });
    });

    await this.audit(eleccionId, 'CIERRE_VOTACION', actor);
    return this.obtenerEstado(eleccionId);
  }

  async generarResultados(
    eleccionId: string,
    dto: PasoJornadaDto,
    actor: Actor,
  ) {
    const jornada = await this.ensureJornada(eleccionId);
    if (!jornada.votacionCerradaAt) {
      throw new BadRequestException(
        'Debe cerrar la votacion antes de generar resultados.',
      );
    }

    const eleccion = await this.getEleccion(eleccionId);
    const fechaPublicacion =
      eleccion.cronograma?.fechaPublicacionResultados;
    if (!fechaPublicacion) {
      throw new BadRequestException(
        'Configure la fecha de publicacion de resultados en el cronograma.',
      );
    }
    if (!dto.forzar && new Date() < fechaPublicacion) {
      throw new BadRequestException(
        `Los resultados podran publicarse desde ${fechaPublicacion.toLocaleString('es-EC')}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (eleccion.estado === EstadoEleccion.VOTACION_CERRADA) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.RESULTADOS_PROVISIONALES },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.RESULTADOS_PROVISIONALES,
            comentario: 'Publicacion de resultados desde la jornada electoral.',
            usuario: actor.user.usuario,
          },
        });
      }
      await tx.jornadaElectoral.update({
        where: { id: jornada.id },
        data: { resultadosAt: new Date() },
      });
      await tx.jornadaEvento.create({
        data: {
          jornadaId: jornada.id,
          paso: 'RESULTADOS',
          reporte: dto.reporte ?? 'Resultados electorales publicados.',
          usuario: actor.user.usuario,
        },
      });
    });

    await this.audit(eleccionId, 'RESULTADOS', actor);
    return this.obtenerEstado(eleccionId);
  }

  async reactivarLink(eleccionId: string, actor: Actor) {
    const jornada = await this.ensureJornada(eleccionId);
    if (!jornada.votacionIniciadaAt || jornada.votacionCerradaAt) {
      throw new BadRequestException(
        'El link solo puede reactivarse con la votacion abierta.',
      );
    }
    if (
      jornada.fechaFinVotacion &&
      new Date() >= jornada.fechaFinVotacion
    ) {
      throw new BadRequestException(
        'El cronograma de votacion ya finalizo y el link no puede reactivarse.',
      );
    }
    await this.prisma.jornadaElectoral.update({
      where: { id: jornada.id },
      data: { linkVotacionActivo: true },
    });
    await this.audit(eleccionId, 'REACTIVAR_LINK', actor);
    return this.obtenerEstado(eleccionId);
  }

  async reiniciar(eleccionId: string, dto: ReiniciarJornadaDto, actor: Actor) {
    const jornada = await this.ensureJornada(eleccionId);
    const eleccion = await this.getEleccion(eleccionId);

    await this.prisma.$transaction(async (tx) => {
      await tx.conteoVoto.deleteMany({ where: { eleccionId } });
      await tx.votoEmitido.deleteMany({ where: { eleccionId } });
      await tx.jornadaEvento.deleteMany({ where: { jornadaId: jornada.id } });
      // Las credenciales quedan invalidadas y "pendientes" de nuevo: sin esto,
      // el padron sigue marcado como generado/enviado del ciclo anterior y
      // "Reenviar pendientes" no encuentra nada que reenviar tras reiniciar.
      await tx.padronElectoral.updateMany({
        where: { eleccionId },
        data: {
          credencialHash: null,
          credencialGeneradaAt: null,
          credencialEnviadaAt: null,
          credencialRevocadaAt: null,
          credencialEnvioError: null,
          credencialVersion: { increment: 1 },
        },
      });
      await tx.jornadaElectoral.update({
        where: { id: jornada.id },
        data: {
          configBloqueada: false,
          inicializadaAt: null,
          puestaCeroAt: null,
          votacionIniciadaAt: null,
          votacionCerradaAt: null,
          resultadosAt: null,
          fechaFinVotacion: null,
          linkVotacionActivo: false,
        },
      });
      if (
        eleccion.estado === EstadoEleccion.VOTACION_ABIERTA ||
        eleccion.estado === EstadoEleccion.VOTACION_CERRADA ||
        eleccion.estado === EstadoEleccion.RESULTADOS_PROVISIONALES
      ) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.CANDIDATURAS_CALIFICADAS },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.CANDIDATURAS_CALIFICADAS,
            comentario: `Reinicio de la jornada electoral. Motivo: ${dto.motivo.trim()}`,
            usuario: actor.user.usuario,
          },
        });
      }
    });

    await this.audit(eleccionId, 'REINICIAR', actor, { motivo: dto.motivo.trim() });
    return this.obtenerEstado(eleccionId);
  }

  private pasoActual(jornada: {
    inicializadaAt: Date | null;
    puestaCeroAt: Date | null;
    votacionIniciadaAt: Date | null;
    votacionCerradaAt: Date | null;
    resultadosAt: Date | null;
  }): number {
    if (!jornada.inicializadaAt) return 1;
    if (!jornada.puestaCeroAt) return 2;
    if (!jornada.votacionIniciadaAt) return 3;
    if (!jornada.votacionCerradaAt) return 4;
    return 5;
  }

  private async ensureJornada(eleccionId: string) {
    await this.getEleccion(eleccionId);
    const existing = await this.prisma.jornadaElectoral.findUnique({
      where: { eleccionId },
      include: { eventos: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return existing;
    return this.prisma.jornadaElectoral.create({
      data: { eleccionId },
      include: { eventos: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private async getEleccion(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        estado: true,
        configuracion: { select: { nombreInstitucion: true } },
        cronograma: {
          select: {
            fechaInicioVotacion: true,
            fechaFinVotacion: true,
            fechaPublicacionResultados: true,
          },
        },
      },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');
    return eleccion;
  }

  private async obtenerResumenCredenciales(eleccionId: string) {
    const padronBase = {
      eleccionId,
      publicado: true,
      estado: EstadoPadronElector.HABILITADO,
      elector: { activo: true },
    } satisfies Prisma.PadronElectoralWhereInput;

    const [padronHabilitado, credencialesPendientes, correosInvalidos] =
      await Promise.all([
        this.prisma.padronElectoral.count({ where: padronBase }),
        this.prisma.padronElectoral.count({
          where: {
            ...padronBase,
            elector: {
              activo: true,
              votosEmitidos: { none: { eleccionId } },
            },
            OR: [
              { credencialHash: null },
              { credencialEnviadaAt: null },
              { credencialRevocadaAt: { not: null } },
              { credencialEnvioError: { not: null } },
            ],
          },
        }),
        this.prisma.padronElectoral.count({
          where: {
            ...padronBase,
            elector: {
              activo: true,
              OR: [
                { email: null },
                { email: '' },
                {
                  AND: [
                    {
                      NOT: {
                        email: {
                          endsWith: '@yavirac.edu.ec',
                          mode: 'insensitive',
                        },
                      },
                    },
                    {
                      NOT: {
                        email: {
                          endsWith: '.yavirac.edu.ec',
                          mode: 'insensitive',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        }),
      ]);

    return {
      padronHabilitado,
      credencialesEnviadas: Math.max(
        0,
        padronHabilitado - credencialesPendientes,
      ),
      credencialesPendientes,
      correosInvalidos,
    };
  }

  private audit(
    eleccionId: string,
    paso: string,
    actor: Actor,
    extra?: Record<string, unknown>,
  ) {
    return this.auditoria.registrar({
      tabla: AuditTabla.JORNADAS_ELECTORALES,
      operacion: AuditOperacion.ESTADO,
      registroId: eleccionId,
      datosNuevos: { paso, ...extra },
      usuario: actor.user.usuario,
      ip: actor.ip,
    });
  }
}
