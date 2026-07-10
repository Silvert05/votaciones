import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import {
  EstadoEleccion,
  TipoEleccion,
  TipoElector,
} from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import {
  AuditOperacion,
  AuditTabla,
} from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuthUser } from '../auth/entities/auth.entity';
import { UpsertConfiguracionEleccionDto } from './dto/configuracion.dto';
import { UpsertCronogramaDto } from './dto/cronograma.dto';
import {
  CambiarEstadoEleccionDto,
  CreateEleccionDto,
  QueryEleccionesDto,
  UpdateEleccionDto,
} from './dto/eleccion.dto';
import {
  CreateDignidadDto,
  UpdateDignidadDto,
} from './dto/dignidad.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

const eleccionListSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  tipo: true,
  estado: true,
  fechaConvocatoria: true,
  aprobadaPorOcs: true,
  vueltaActual: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      dignidades: true,
    },
  },
} satisfies Prisma.EleccionSelect;

const eleccionDetailSelect = {
  ...eleccionListSelect,
  configuracion: true,
  cronograma: true,
  dignidades: {
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  },
  historialEstados: {
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
} satisfies Prisma.EleccionSelect;

const allowedTransitions: Record<EstadoEleccion, EstadoEleccion[]> = {
  BORRADOR: ['CONVOCADA', 'ANULADA'],
  CONVOCADA: ['PADRON_PUBLICADO', 'CANDIDATURAS_ABIERTAS', 'ANULADA'],
  PADRON_PUBLICADO: ['CANDIDATURAS_ABIERTAS', 'ANULADA'],
  CANDIDATURAS_ABIERTAS: ['CANDIDATURAS_CALIFICADAS', 'ANULADA'],
  CANDIDATURAS_CALIFICADAS: ['CAMPANIA', 'ANULADA'],
  CAMPANIA: ['VOTACION_ABIERTA', 'ANULADA'],
  VOTACION_ABIERTA: ['VOTACION_CERRADA', 'ANULADA'],
  VOTACION_CERRADA: ['ESCRUTINIO', 'ANULADA'],
  ESCRUTINIO: ['RESULTADOS_PROVISIONALES', 'ANULADA'],
  RESULTADOS_PROVISIONALES: ['IMPUGNACION_RESULTADOS', 'RESULTADOS_DEFINITIVOS', 'ANULADA'],
  IMPUGNACION_RESULTADOS: ['RESULTADOS_DEFINITIVOS', 'ANULADA'],
  RESULTADOS_DEFINITIVOS: ['POSESIONADA', 'ANULADA'],
  POSESIONADA: [],
  ANULADA: [],
};

@Injectable()
export class EleccionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async findAll(query: QueryEleccionesDto) {
    const { page, limit, search, tipo, estado } = query;
    const where: Prisma.EleccionWhereInput = {};

    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.eleccion.findMany({
        where,
        select: eleccionListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eleccion.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id },
      select: eleccionDetailSelect,
    });

    if (!eleccion) {
      throw new NotFoundException('Eleccion no encontrada.');
    }

    return eleccion;
  }

  async create(dto: CreateEleccionDto, actor: Actor) {
    const created = await this.prisma.$transaction(async (tx) => {
      const eleccion = await tx.eleccion.create({
        data: {
          nombre: dto.nombre,
          descripcion: this.emptyToNull(dto.descripcion),
          tipo: dto.tipo,
          fechaConvocatoria: this.toDate(dto.fechaConvocatoria),
          aprobadaPorOcs: dto.aprobadaPorOcs ?? false,
        },
        select: eleccionDetailSelect,
      });

      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId: eleccion.id,
          estadoAnterior: null,
          estadoNuevo: eleccion.estado,
          comentario: 'Creacion de la eleccion',
          usuario: actor.user.usuario,
        },
      });

      return eleccion;
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.CREATE, created.id, {
      datosNuevos: created,
      actor,
    });

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateEleccionDto, actor: Actor) {
    const before = await this.findOne(id);

    const eleccion = await this.prisma.eleccion.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: this.emptyToNull(dto.descripcion) }
          : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.fechaConvocatoria !== undefined
          ? { fechaConvocatoria: this.toDate(dto.fechaConvocatoria) }
          : {}),
        ...(dto.aprobadaPorOcs !== undefined
          ? { aprobadaPorOcs: dto.aprobadaPorOcs }
          : {}),
        ...(dto.vueltaActual !== undefined
          ? { vueltaActual: dto.vueltaActual }
          : {}),
      },
      select: eleccionDetailSelect,
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.UPDATE, id, {
      datosAnteriores: before,
      datosNuevos: eleccion,
      actor,
    });

    return eleccion;
  }

  async cambiarEstado(id: string, dto: CambiarEstadoEleccionDto, actor: Actor) {
    const before = await this.findOne(id);
    if (before.estado === dto.estado) {
      return before;
    }

    if (!allowedTransitions[before.estado].includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede cambiar la eleccion de ${before.estado} a ${dto.estado}.`,
      );
    }

    const eleccion = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.eleccion.update({
        where: { id },
        data: { estado: dto.estado },
        select: eleccionDetailSelect,
      });

      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId: id,
          estadoAnterior: before.estado,
          estadoNuevo: dto.estado,
          comentario: this.emptyToNull(dto.comentario),
          usuario: actor.user.usuario,
        },
      });

      return updated;
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.ESTADO, id, {
      datosAnteriores: { estado: before.estado },
      datosNuevos: { estado: eleccion.estado, comentario: dto.comentario },
      actor,
    });

    return this.findOne(id);
  }

  async upsertCronograma(
    eleccionId: string,
    dto: UpsertCronogramaDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);
    this.validateCronograma(dto);

    const before = await this.prisma.cronogramaElectoral.findUnique({
      where: { eleccionId },
    });

    const data = this.toCronogramaData(dto);
    const cronograma = await this.prisma.cronogramaElectoral.upsert({
      where: { eleccionId },
      update: data,
      create: {
        eleccionId,
        ...data,
      },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, before ? AuditOperacion.UPDATE : AuditOperacion.CREATE, cronograma.id, {
      datosAnteriores: before,
      datosNuevos: cronograma,
      actor,
    });

    return cronograma;
  }

  async getConfiguracion(eleccionId: string) {
    await this.ensureEleccion(eleccionId);
    return this.prisma.configuracionEleccion.findUnique({
      where: { eleccionId },
    });
  }

  async upsertConfiguracion(
    eleccionId: string,
    dto: UpsertConfiguracionEleccionDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);

    const before = await this.prisma.configuracionEleccion.findUnique({
      where: { eleccionId },
    });

    const data = {
      nombreInstitucion: this.emptyToNull(dto.nombreInstitucion),
      logoUrl: this.emptyToNull(dto.logoUrl),
      escudoUrl: this.emptyToNull(dto.escudoUrl),
      videoUrl: this.emptyToNull(dto.videoUrl),
      colorPrimario: this.emptyToNull(dto.colorPrimario),
      colorSecundario: this.emptyToNull(dto.colorSecundario),
      colorAcento: this.emptyToNull(dto.colorAcento),
      mensajeBienvenida: this.emptyToNull(dto.mensajeBienvenida),
    };

    const configuracion = await this.prisma.configuracionEleccion.upsert({
      where: { eleccionId },
      update: data,
      create: { eleccionId, ...data },
    });

    await this.audit(
      AuditTabla.CONFIGURACIONES_ELECCION,
      before ? AuditOperacion.UPDATE : AuditOperacion.CREATE,
      configuracion.id,
      { datosAnteriores: before, datosNuevos: configuracion, actor },
    );

    return configuracion;
  }

  async createDignidad(
    eleccionId: string,
    dto: CreateDignidadDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);

    const dignidad = await this.prisma.dignidad.create({
      data: {
        eleccionId,
        nombre: dto.nombre,
        descripcion: this.emptyToNull(dto.descripcion),
        tipoElectorPermitido: dto.tipoElectorPermitido ?? TipoElector.AMBOS,
        cantidadGanadores: dto.cantidadGanadores ?? 1,
        requiereLista: dto.requiereLista ?? true,
        orden: dto.orden ?? 0,
      },
    });

    await this.audit(AuditTabla.DIGNIDADES, AuditOperacion.CREATE, dignidad.id, {
      datosNuevos: dignidad,
      actor,
    });

    return dignidad;
  }

  async updateDignidad(
    eleccionId: string,
    dignidadId: string,
    dto: UpdateDignidadDto,
    actor: Actor,
  ) {
    const before = await this.findDignidadOrFail(eleccionId, dignidadId);

    const dignidad = await this.prisma.dignidad.update({
      where: { id: dignidadId },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: this.emptyToNull(dto.descripcion) }
          : {}),
        ...(dto.tipoElectorPermitido !== undefined
          ? { tipoElectorPermitido: dto.tipoElectorPermitido }
          : {}),
        ...(dto.cantidadGanadores !== undefined
          ? { cantidadGanadores: dto.cantidadGanadores }
          : {}),
        ...(dto.requiereLista !== undefined
          ? { requiereLista: dto.requiereLista }
          : {}),
        ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });

    await this.audit(AuditTabla.DIGNIDADES, AuditOperacion.UPDATE, dignidad.id, {
      datosAnteriores: before,
      datosNuevos: dignidad,
      actor,
    });

    return dignidad;
  }

  async deleteDignidad(eleccionId: string, dignidadId: string, actor: Actor) {
    const before = await this.findDignidadOrFail(eleccionId, dignidadId);
    const dignidad = await this.prisma.dignidad.update({
      where: { id: dignidadId },
      data: { activo: false },
    });

    await this.audit(AuditTabla.DIGNIDADES, AuditOperacion.ESTADO, dignidad.id, {
      datosAnteriores: { activo: before.activo },
      datosNuevos: { activo: dignidad.activo },
      actor,
    });

    return dignidad;
  }

  private async ensureEleccion(id: string) {
    const exists = await this.prisma.eleccion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Eleccion no encontrada.');
    }
  }

  private async findDignidadOrFail(eleccionId: string, dignidadId: string) {
    const dignidad = await this.prisma.dignidad.findFirst({
      where: { id: dignidadId, eleccionId },
    });
    if (!dignidad) {
      throw new NotFoundException('Dignidad no encontrada.');
    }
    return dignidad;
  }

  private validateCronograma(dto: UpsertCronogramaDto) {
    const dates = this.toCronogramaData(dto);
    this.ensureOrder(dates.fechaInicioInscripcion, dates.fechaFinInscripcion, 'La inscripcion debe cerrar despues de iniciar.');
    this.ensureOrder(
      dates.fechaInicioImpugnacionCandidaturas,
      dates.fechaFinImpugnacionCandidaturas,
      'La impugnacion de candidaturas debe cerrar despues de iniciar.',
    );
    this.ensureOrder(dates.fechaInicioCampania, dates.fechaFinCampania, 'La campania debe cerrar despues de iniciar.');
    this.ensureOrder(dates.fechaInicioVotacion, dates.fechaFinVotacion, 'La votacion debe cerrar despues de iniciar.');

    if (dates.fechaPublicacionPadron && dates.fechaInicioVotacion) {
      const min = new Date(dates.fechaInicioVotacion);
      min.setDate(min.getDate() - 10);
      if (dates.fechaPublicacionPadron > min) {
        throw new BadRequestException(
          'El padron debe publicarse al menos 10 dias antes de la votacion.',
        );
      }
    }

    if (dates.fechaFinCampania && dates.fechaInicioVotacion) {
      const max = new Date(dates.fechaInicioVotacion);
      max.setHours(max.getHours() - 24);
      if (dates.fechaFinCampania > max) {
        throw new BadRequestException(
          'La campania debe suspenderse al menos 24 horas antes de la votacion.',
        );
      }
    }
  }

  private ensureOrder(
    start: Date | null | undefined,
    end: Date | null | undefined,
    message: string,
  ) {
    if (start && end && start > end) {
      throw new BadRequestException(message);
    }
  }

  private toCronogramaData(dto: UpsertCronogramaDto) {
    return {
      fechaConvocatoria: this.toDate(dto.fechaConvocatoria),
      fechaPublicacionPadron: this.toDate(dto.fechaPublicacionPadron),
      fechaInicioInscripcion: this.toDate(dto.fechaInicioInscripcion),
      fechaFinInscripcion: this.toDate(dto.fechaFinInscripcion),
      fechaInicioImpugnacionCandidaturas: this.toDate(
        dto.fechaInicioImpugnacionCandidaturas,
      ),
      fechaFinImpugnacionCandidaturas: this.toDate(
        dto.fechaFinImpugnacionCandidaturas,
      ),
      fechaPublicacionCandidaturas: this.toDate(
        dto.fechaPublicacionCandidaturas,
      ),
      fechaInicioCampania: this.toDate(dto.fechaInicioCampania),
      fechaFinCampania: this.toDate(dto.fechaFinCampania),
      fechaInicioVotacion: this.toDate(dto.fechaInicioVotacion),
      fechaFinVotacion: this.toDate(dto.fechaFinVotacion),
      fechaPublicacionResultados: this.toDate(
        dto.fechaPublicacionResultados,
      ),
      fechaFinImpugnacionResultados: this.toDate(
        dto.fechaFinImpugnacionResultados,
      ),
      fechaResultadosFinales: this.toDate(dto.fechaResultadosFinales),
    };
  }

  private toDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Fecha invalida: ${value}`);
    }
    return date;
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
    params: {
      datosAnteriores?: unknown;
      datosNuevos?: unknown;
      actor: Actor;
    },
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
