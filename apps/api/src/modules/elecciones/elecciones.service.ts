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
import {
  PublicarCronogramaDto,
  UpdateEtiquetasCronogramaDto,
  UpdateOrdenCronogramaDto,
  UpsertCronogramaDto,
} from './dto/cronograma.dto';
import {
  CambiarEstadoEleccionDto,
  CreateEleccionDto,
  QueryEleccionesDto,
  SetPortalPublicoDto,
  UpdateEleccionDto,
} from './dto/eleccion.dto';
import {
  CreateDignidadDto,
  UpdateDignidadDto,
} from './dto/dignidad.dto';
import {
  CreateCronogramaItemDto,
  UpdateCronogramaItemDto,
} from './dto/cronograma-item.dto';

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
  vueltaActual: true,
  portalPublico: true,
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
  // "Escrutinio" no se ofrece como salto manual (no tiene pantalla en Gestion;
  // se gestiona desde Jornada, que avanza a RESULTADOS_PROVISIONALES al generar
  // resultados). El estado se conserva en el enum por historiales existentes.
  VOTACION_CERRADA: ['ANULADA'],
  ESCRUTINIO: ['RESULTADOS_PROVISIONALES', 'ANULADA'],
  // "Impugnacion de resultados" no se ofrece como salto manual (no tiene
  // pantalla; el cierre se gestiona desde Jornada). El estado se conserva en el
  // enum por compatibilidad con historiales existentes.
  RESULTADOS_PROVISIONALES: ['RESULTADOS_DEFINITIVOS', 'ANULADA'],
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
      // Si no hay ningún proceso "activo" en el portal (ninguno marcado, o el
      // marcado ya está posesionado/anulado), el proceso nuevo toma el portal.
      const portalActivo = await tx.eleccion.count({
        where: {
          portalPublico: true,
          estado: { notIn: ['POSESIONADA', 'ANULADA'] },
        },
      });

      const eleccion = await tx.eleccion.create({
        data: {
          nombre: dto.nombre,
          descripcion: this.emptyToNull(dto.descripcion),
          tipo: dto.tipo,
          portalPublico: portalActivo === 0,
          // Cada proceso nace con una jornada propia y vacía. Nunca reutiliza
          // eventos, votos ni estados de la elección anterior.
          jornada: { create: {} },
        },
        select: eleccionDetailSelect,
      });

      if (portalActivo === 0) {
        await tx.eleccion.updateMany({
          where: { id: { not: eleccion.id }, portalPublico: true },
          data: { portalPublico: false },
        });
      }

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

  /**
   * Marca (o desmarca) la eleccion que ve el portal publico. Solo una puede
   * estarlo a la vez: activar una desactiva a las demas.
   */
  async setPortalPublico(
    id: string,
    dto: SetPortalPublicoDto,
    actor: Actor,
  ) {
    const before = await this.findOne(id);

    if (dto.portalPublico) {
      await this.prisma.$transaction([
        this.prisma.eleccion.updateMany({
          where: { portalPublico: true, id: { not: id } },
          data: { portalPublico: false },
        }),
        this.prisma.eleccion.update({
          where: { id },
          data: { portalPublico: true },
        }),
      ]);
    } else {
      await this.prisma.eleccion.update({
        where: { id },
        data: { portalPublico: false },
      });
    }

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.UPDATE, id, {
      datosAnteriores: { portalPublico: before.portalPublico },
      datosNuevos: { portalPublico: dto.portalPublico },
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

    const before = await this.prisma.cronogramaElectoral.findUnique({
      where: { eleccionId },
    });
    this.validateCronograma(dto);

    const data = this.toCronogramaData(dto);
    const detalles =
      dto.detallesHitos === undefined
        ? {}
        : { detallesHitos: this.sanitizeDetallesHitos(dto.detallesHitos) };
    const cronograma = await this.prisma.cronogramaElectoral.upsert({
      where: { eleccionId },
      update: { ...data, ...detalles },
      create: {
        eleccionId,
        ...data,
        ...detalles,
      },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, before ? AuditOperacion.UPDATE : AuditOperacion.CREATE, cronograma.id, {
      datosAnteriores: before,
      datosNuevos: cronograma,
      actor,
    });

    return cronograma;
  }

  async updateOrdenCronograma(
    eleccionId: string,
    dto: UpdateOrdenCronogramaDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);

    const before = await this.prisma.cronogramaElectoral.findUnique({
      where: { eleccionId },
    });

    const cronograma = await this.prisma.cronogramaElectoral.upsert({
      where: { eleccionId },
      update: { ordenHitos: dto.orden },
      create: { eleccionId, ordenHitos: dto.orden },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, AuditOperacion.UPDATE, cronograma.id, {
      datosAnteriores: { ordenHitos: before?.ordenHitos ?? [] },
      datosNuevos: { ordenHitos: cronograma.ordenHitos },
      actor,
    });

    return cronograma;
  }

  async setPublicacionCronograma(
    eleccionId: string,
    dto: PublicarCronogramaDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);

    const before = await this.prisma.cronogramaElectoral.findUnique({
      where: { eleccionId },
    });

    const cronograma = await this.prisma.cronogramaElectoral.upsert({
      where: { eleccionId },
      update: { publicado: dto.publicado },
      create: { eleccionId, publicado: dto.publicado },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, AuditOperacion.UPDATE, cronograma.id, {
      datosAnteriores: { publicado: before?.publicado ?? false },
      datosNuevos: { publicado: cronograma.publicado },
      actor,
    });

    return cronograma;
  }

  async updateEtiquetasCronograma(
    eleccionId: string,
    dto: UpdateEtiquetasCronogramaDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);

    const before = await this.prisma.cronogramaElectoral.findUnique({
      where: { eleccionId },
    });

    const etiquetasActuales =
      (before?.etiquetasHitos as Record<string, string> | null) ?? {};
    const etiquetas: Record<string, string> = { ...etiquetasActuales };
    for (const [campo, valor] of Object.entries(dto.etiquetas ?? {})) {
      const limpio = typeof valor === 'string' ? valor.trim().slice(0, 160) : '';
      if (limpio) {
        etiquetas[campo] = limpio;
      } else {
        delete etiquetas[campo];
      }
    }

    const cronograma = await this.prisma.cronogramaElectoral.upsert({
      where: { eleccionId },
      update: { etiquetasHitos: etiquetas },
      create: { eleccionId, etiquetasHitos: etiquetas },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, AuditOperacion.UPDATE, cronograma.id, {
      datosAnteriores: { etiquetasHitos: etiquetasActuales },
      datosNuevos: { etiquetasHitos: etiquetas },
      actor,
    });

    return cronograma;
  }

  async listCronogramaItems(eleccionId: string) {
    await this.ensureEleccion(eleccionId);

    return this.prisma.cronogramaItem.findMany({
      where: { eleccionId },
      orderBy: { fecha: 'asc' },
    });
  }

  async createCronogramaItem(
    eleccionId: string,
    dto: CreateCronogramaItemDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);

    const fecha = this.toDate(dto.fecha);
    const fechaFin = this.toDate(dto.fechaFin);
    this.ensureFechasItem(fecha, fechaFin);

    const item = await this.prisma.cronogramaItem.create({
      data: {
        eleccionId,
        nombre: dto.nombre,
        fecha,
        fechaFin,
        descripcion: this.emptyToNull(dto.descripcion),
      },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, AuditOperacion.CREATE, item.id, {
      datosNuevos: item,
      actor,
    });

    return item;
  }

  async updateCronogramaItem(
    eleccionId: string,
    itemId: string,
    dto: UpdateCronogramaItemDto,
    actor: Actor,
  ) {
    const before = await this.findCronogramaItemOrFail(eleccionId, itemId);

    const fecha =
      dto.fecha !== undefined ? this.toDate(dto.fecha) : before.fecha;
    const fechaFin =
      dto.fechaFin !== undefined ? this.toDate(dto.fechaFin) : before.fechaFin;
    this.ensureFechasItem(fecha, fechaFin);

    const item = await this.prisma.cronogramaItem.update({
      where: { id: itemId },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.fecha !== undefined ? { fecha } : {}),
        ...(dto.fechaFin !== undefined ? { fechaFin } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: this.emptyToNull(dto.descripcion) }
          : {}),
      },
    });

    await this.audit(AuditTabla.CRONOGRAMAS, AuditOperacion.UPDATE, item.id, {
      datosAnteriores: before,
      datosNuevos: item,
      actor,
    });

    return item;
  }

  async deleteCronogramaItem(eleccionId: string, itemId: string, actor: Actor) {
    const before = await this.findCronogramaItemOrFail(eleccionId, itemId);

    await this.prisma.cronogramaItem.delete({ where: { id: itemId } });

    await this.audit(AuditTabla.CRONOGRAMAS, AuditOperacion.ESTADO, itemId, {
      datosAnteriores: before,
      datosNuevos: null,
      actor,
    });

    return { id: itemId };
  }

  async dashboard() {
    const estadosFinales: EstadoEleccion[] = [
      EstadoEleccion.POSESIONADA,
      EstadoEleccion.ANULADA,
    ];

    const [
      totalElecciones,
      procesosActivos,
      electores,
      electoresActivos,
      listas,
      candidaturasCalificadas,
      votosEmitidos,
      procesoActual,
      recientes,
    ] = await Promise.all([
      this.prisma.eleccion.count(),
      this.prisma.eleccion.count({
        where: { estado: { notIn: estadosFinales } },
      }),
      this.prisma.elector.count(),
      this.prisma.elector.count({ where: { activo: true } }),
      this.prisma.listaElectoral.count(),
      this.prisma.candidatura.count({ where: { estado: 'CALIFICADA' } }),
      this.prisma.votoEmitido.count(),
      this.prisma.eleccion.findFirst({
        where: { estado: { notIn: estadosFinales } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          estado: true,
          updatedAt: true,
          cronograma: {
            select: {
              fechaInicioVotacion: true,
              fechaFinVotacion: true,
            },
          },
          _count: {
            select: {
              dignidades: true,
              padron: true,
              candidaturas: true,
              votosEmitidos: true,
            },
          },
        },
      }),
      this.prisma.eleccion.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          nombre: true,
          estado: true,
          updatedAt: true,
          _count: {
            select: { padron: true, candidaturas: true, votosEmitidos: true },
          },
        },
      }),
    ]);

    let participacion = { habilitados: 0, votantes: 0, porcentaje: 0 };
    if (procesoActual) {
      const [habilitados, votantesRows] = await Promise.all([
        this.prisma.padronElectoral.count({
          where: {
            eleccionId: procesoActual.id,
            estado: 'HABILITADO',
          },
        }),
        this.prisma.votoEmitido.findMany({
          where: { eleccionId: procesoActual.id },
          distinct: ['electorId'],
          select: { electorId: true },
        }),
      ]);
      participacion = {
        habilitados,
        votantes: votantesRows.length,
        porcentaje: habilitados
          ? Math.round((votantesRows.length / habilitados) * 10000) / 100
          : 0,
      };
    }

    return {
      resumen: {
        totalElecciones,
        procesosActivos,
        electores,
        electoresActivos,
        listas,
        candidaturasCalificadas,
        votosEmitidos,
      },
      procesoActual,
      participacion,
      recientes,
    };
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

  private async findCronogramaItemOrFail(eleccionId: string, itemId: string) {
    const item = await this.prisma.cronogramaItem.findFirst({
      where: { id: itemId, eleccionId },
    });
    if (!item) {
      throw new NotFoundException('Item de cronograma no encontrado.');
    }
    return item;
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
    this.ensureOrder(
      dates.fechaFinVotacion,
      dates.fechaPublicacionResultados,
      'Los resultados deben publicarse despues del cierre de la votacion.',
    );

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

    if (dates.fechaConvocatoria && dates.fechaInicioVotacion) {
      const minimo = new Date(dates.fechaConvocatoria);
      minimo.setDate(minimo.getDate() + 20);
      if (dates.fechaInicioVotacion < minimo) {
        throw new BadRequestException(
          'La convocatoria debe realizarse con al menos veinte (20) dias de anticipacion a la votacion (Art. 9).',
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

  /**
   * Un ítem del cronograma necesita al menos una fecha (inicio o fin) y, si
   * tiene las dos, la de fin debe ser posterior a la de inicio.
   */
  private ensureFechasItem(
    fecha: Date | null | undefined,
    fechaFin: Date | null | undefined,
  ) {
    if (!fecha && !fechaFin) {
      throw new BadRequestException(
        'El ítem del cronograma necesita al menos una fecha (inicio o fin).',
      );
    }
    this.ensureOrder(
      fecha,
      fechaFin,
      'La fecha de fin del ítem debe ser posterior a la de inicio (día y hora).',
    );
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
      lugarVotacion: dto.lugarVotacion?.trim() || null,
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

  /**
   * Normaliza el detalle opcional de los hitos fijos: solo conserva las claves
   * con una fecha de fin valida y/o descripcion, y valida el orden de fechas.
   */
  private sanitizeDetallesHitos(
    input:
      | Record<string, { fechaFin?: string | null; descripcion?: string | null }>
      | null
      | undefined,
  ): Prisma.InputJsonValue {
    const limpio: Record<
      string,
      { fechaFin?: string; descripcion?: string }
    > = {};
    for (const [campo, valor] of Object.entries(input ?? {})) {
      if (!valor || typeof valor !== 'object') continue;
      const fechaFin = this.toDate(valor.fechaFin ?? null);
      const descripcion =
        typeof valor.descripcion === 'string'
          ? valor.descripcion.trim().slice(0, 500)
          : '';
      const entrada: { fechaFin?: string; descripcion?: string } = {};
      if (fechaFin) entrada.fechaFin = fechaFin.toISOString();
      if (descripcion) entrada.descripcion = descripcion;
      if (Object.keys(entrada).length) limpio[campo] = entrada;
    }
    return limpio as Prisma.InputJsonValue;
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
