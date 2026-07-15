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
} from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import { VotacionService } from '../votacion/votacion.service';

const RESULT_STATES: EstadoEleccion[] = [
  EstadoEleccion.VOTACION_CERRADA,
  EstadoEleccion.ESCRUTINIO,
  EstadoEleccion.RESULTADOS_PROVISIONALES,
  EstadoEleccion.IMPUGNACION_RESULTADOS,
  EstadoEleccion.RESULTADOS_DEFINITIVOS,
  EstadoEleccion.POSESIONADA,
];

const VISIBLE_STATES: EstadoEleccion[] = [
  EstadoEleccion.CONVOCADA,
  EstadoEleccion.PADRON_PUBLICADO,
  EstadoEleccion.CANDIDATURAS_ABIERTAS,
  EstadoEleccion.CANDIDATURAS_CALIFICADAS,
  EstadoEleccion.CAMPANIA,
  EstadoEleccion.VOTACION_ABIERTA,
  ...RESULT_STATES,
];

const publicSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  tipo: true,
  estado: true,
  configuracion: true,
  cronograma: true,
  jornada: {
    select: {
      linkVotacionActivo: true,
      fechaFinVotacion: true,
      votacionIniciadaAt: true,
      votacionCerradaAt: true,
      resultadosAt: true,
    },
  },
} satisfies Prisma.EleccionSelect;

@Injectable()
export class PublicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly votacion: VotacionService,
  ) {}

  async listElecciones() {
    const data = await this.prisma.eleccion.findMany({
      where: { estado: { in: VISIBLE_STATES } },
      orderBy: { createdAt: 'desc' },
      select: publicSelect,
    });
    return data.map((e) => this.mapPublic(e));
  }

  async landing(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: publicSelect,
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');
    return this.mapPublic(eleccion);
  }

  async resultados(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: {
        estado: true,
        jornada: {
          select: {
            votacionIniciadaAt: true,
            votacionCerradaAt: true,
            fechaFinVotacion: true,
          },
        },
      },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');
    if (!RESULT_STATES.includes(eleccion.estado)) {
      throw new BadRequestException('Los resultados aun no estan disponibles.');
    }
    const resultados = await this.votacion.resultados(eleccionId);
    return {
      ...resultados,
      fechaInicio: eleccion.jornada?.votacionIniciadaAt ?? null,
      fechaFin:
        eleccion.jornada?.votacionCerradaAt ??
        eleccion.jornada?.fechaFinVotacion ??
        null,
    };
  }

  async candidatos(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: {
        id: true,
        nombre: true,
        estado: true,
        configuracion: { select: { nombreInstitucion: true } },
      },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');

    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        cantidadGanadores: true,
        candidaturas: {
          where: { estado: EstadoCandidatura.CALIFICADA },
          orderBy: [
            { lista: { codigo: 'asc' } },
            { orden: 'asc' },
            { elector: { apellidos: 'asc' } },
          ],
          select: {
            id: true,
            orden: true,
            elector: {
              select: {
                id: true,
                identificacion: true,
                nombres: true,
                apellidos: true,
                tipo: true,
                fotoUrl: true,
              },
            },
            lista: {
              select: { id: true, codigo: true, nombre: true, color: true },
            },
          },
        },
      },
    });

    return {
      eleccion: {
        id: eleccion.id,
        nombre: eleccion.nombre,
        institucion: eleccion.configuracion?.nombreInstitucion ?? null,
      },
      dignidades,
    };
  }

  async participacion(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: { id: true, nombre: true, estado: true },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');

    const [padronHabilitado, votantes, dignidades] = await Promise.all([
      this.prisma.padronElectoral.count({
        where: {
          eleccionId,
          publicado: true,
          estado: EstadoPadronElector.HABILITADO,
        },
      }),
      this.prisma.votoEmitido
        .findMany({
          where: { eleccionId },
          distinct: ['electorId'],
          select: { electorId: true },
        })
        .then((rows) => rows.length),
      this.prisma.dignidad.findMany({
        where: { eleccionId, activo: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true },
      }),
    ]);

    const emitidosPorDignidad = await Promise.all(
      dignidades.map(async (d) => ({
        dignidadId: d.id,
        nombre: d.nombre,
        total: await this.prisma.votoEmitido.count({
          where: { eleccionId, dignidadId: d.id },
        }),
      })),
    );

    const porcentaje = padronHabilitado
      ? Math.round((votantes / padronHabilitado) * 10000) / 100
      : 0;

    return {
      eleccion,
      padronHabilitado,
      votantes,
      porcentaje,
      dignidades: emitidosPorDignidad,
    };
  }

  private mapPublic(
    e: Prisma.EleccionGetPayload<{ select: typeof publicSelect }>,
  ) {
    const votarDisponible =
      e.estado === EstadoEleccion.VOTACION_ABIERTA &&
      !!e.jornada?.linkVotacionActivo;
    return {
      id: e.id,
      nombre: e.nombre,
      descripcion: e.descripcion,
      tipo: e.tipo,
      estado: e.estado,
      configuracion: e.configuracion,
      cronograma: e.cronograma,
      votarDisponible,
      resultadosDisponibles: RESULT_STATES.includes(e.estado),
      fechaFinVotacion: e.jornada?.fechaFinVotacion ?? null,
    };
  }
}
