import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import {
  EstadoCandidatura,
  EstadoEleccion,
  EstadoImpugnacionResultado,
  EstadoListaElectoral,
  EstadoPadronElector,
  TipoElector,
} from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import {
  AuditOperacion,
  AuditTabla,
} from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuthUser } from '../auth/entities/auth.entity';
import {
  CalificarCandidaturaDto,
  CreateCandidaturaDto,
  ImpugnarCalificacionDto,
  QueryCandidaturasDto,
  ResolverImpugnacionCandidaturaDto,
  SubsanarCandidaturaDto,
  UpdateCandidaturaDto,
} from './dto/candidatura.dto';
import {
  CreateListaDto,
  QueryListasDto,
  SetDignidadListaEstadoDto,
  UpdateListaDto,
} from './dto/lista.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

const listaSelect = {
  id: true,
  eleccionId: true,
  codigo: true,
  nombre: true,
  color: true,
  descripcion: true,
  propuesta: true,
  estado: true,
  observacion: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { candidaturas: true } },
} satisfies Prisma.ListaElectoralSelect;

const candidaturaSelect = {
  id: true,
  eleccionId: true,
  dignidadId: true,
  electorId: true,
  listaId: true,
  orden: true,
  estado: true,
  observacion: true,
  plazoSubsanacionAt: true,
  cumpleAprobadoCarrera: true,
  cumplePromedioAcademico: true,
  sancionado: true,
  createdAt: true,
  updatedAt: true,
  dignidad: {
    select: {
      id: true,
      nombre: true,
      tipoElectorPermitido: true,
      requiereLista: true,
    },
  },
  elector: {
    select: {
      id: true,
      identificacion: true,
      nombres: true,
      apellidos: true,
      email: true,
      tipo: true,
      genero: true,
      carreraId: true,
      nivelId: true,
      carrera: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
      activo: true,
    },
  },
  lista: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      color: true,
      estado: true,
    },
  },
} satisfies Prisma.CandidaturaSelect;

@Injectable()
export class CandidaturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async abrirCandidaturas(eleccionId: string, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado === EstadoEleccion.CANDIDATURAS_ABIERTAS) {
      return eleccion;
    }
    if (eleccion.estado !== EstadoEleccion.PADRON_PUBLICADO) {
      throw new BadRequestException(
        'La inscripcion de candidaturas solo se abre despues de publicar el padron.',
      );
    }

    const habilitados = await this.prisma.padronElectoral.count({
      where: {
        eleccionId,
        estado: EstadoPadronElector.HABILITADO,
        publicado: true,
      },
    });
    if (!habilitados) {
      throw new BadRequestException(
        'No se puede abrir candidaturas sin padron publicado con electores habilitados.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.eleccion.update({
        where: { id: eleccionId },
        data: { estado: EstadoEleccion.CANDIDATURAS_ABIERTAS },
      });
      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId,
          estadoAnterior: eleccion.estado,
          estadoNuevo: EstadoEleccion.CANDIDATURAS_ABIERTAS,
          comentario: 'Apertura de inscripcion de candidaturas',
          usuario: actor.user.usuario,
        },
      });
      return next;
    });

    await this.audit(AuditTabla.ELECCIONES, AuditOperacion.ESTADO, eleccionId, {
      datosAnteriores: { estado: eleccion.estado },
      datosNuevos: { estado: updated.estado, habilitados },
      actor,
    });

    return updated;
  }

  async cerrarCalificacion(eleccionId: string, actor: Actor) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado !== EstadoEleccion.CANDIDATURAS_ABIERTAS) {
      throw new BadRequestException(
        'La calificacion solo puede cerrarse con candidaturas abiertas.',
      );
    }

    await this.expirarSubsanacionesVencidas(eleccionId);
    const pendientes = await this.prisma.candidatura.count({
      where: {
        eleccionId,
        estado: { in: [EstadoCandidatura.INSCRITA, EstadoCandidatura.OBSERVADA] },
      },
    });
    if (pendientes) {
      throw new BadRequestException(
        'Existen candidaturas inscritas u observadas pendientes de resolver.',
      );
    }

    const dignidades = await this.prisma.dignidad.findMany({
      where: { eleccionId, activo: true },
      select: { id: true, nombre: true },
    });
    if (!dignidades.length) {
      throw new BadRequestException('La eleccion no tiene dignidades activas.');
    }

    const sinCandidatos: string[] = [];
    for (const dignidad of dignidades) {
      const calificados = await this.prisma.candidatura.count({
        where: {
          eleccionId,
          dignidadId: dignidad.id,
          estado: EstadoCandidatura.CALIFICADA,
        },
      });
      if (!calificados) sinCandidatos.push(dignidad.nombre);
    }
    if (sinCandidatos.length) {
      throw new BadRequestException(
        `Faltan candidaturas calificadas para: ${sinCandidatos.join(', ')}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.eleccion.update({
        where: { id: eleccionId },
        data: { estado: EstadoEleccion.CANDIDATURAS_CALIFICADAS },
      });
      await tx.historialEstadoEleccion.create({
        data: {
          eleccionId,
          estadoAnterior: eleccion.estado,
          estadoNuevo: EstadoEleccion.CANDIDATURAS_CALIFICADAS,
          comentario: 'Cierre de calificacion de candidaturas',
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

  async listListas(eleccionId: string, query: QueryListasDto) {
    await this.ensureEleccion(eleccionId);
    const { page, limit, search, estado } = query;
    const where: Prisma.ListaElectoralWhereInput = { eleccionId };
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.listaElectoral.findMany({
        where,
        select: listaSelect,
        orderBy: [{ codigo: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listaElectoral.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async createLista(eleccionId: string, dto: CreateListaDto, actor: Actor) {
    await this.ensureCanEdit(eleccionId);
    const lista = await this.prisma.listaElectoral.create({
      data: {
        eleccionId,
        codigo: dto.codigo.trim().toUpperCase(),
        nombre: dto.nombre.trim(),
        color: this.emptyToNull(dto.color),
        descripcion: this.emptyToNull(dto.descripcion),
        propuesta: this.emptyToNull(dto.propuesta),
      },
      select: listaSelect,
    });

    await this.audit(AuditTabla.LISTAS_ELECTORALES, AuditOperacion.CREATE, lista.id, {
      datosNuevos: lista,
      actor,
    });

    return lista;
  }

  async updateLista(
    eleccionId: string,
    listaId: string,
    dto: UpdateListaDto,
    actor: Actor,
  ) {
    await this.ensureCanEdit(eleccionId);
    const before = await this.findListaOrFail(eleccionId, listaId);

    if (
      dto.estado === EstadoListaElectoral.CALIFICADA &&
      before.estado !== EstadoListaElectoral.CALIFICADA
    ) {
      await this.validarParidadGenero(listaId);
    }

    const lista = await this.prisma.listaElectoral.update({
      where: { id: listaId },
      data: {
        ...(dto.codigo !== undefined ? { codigo: dto.codigo.trim().toUpperCase() } : {}),
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.color !== undefined ? { color: this.emptyToNull(dto.color) } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: this.emptyToNull(dto.descripcion) }
          : {}),
        ...(dto.propuesta !== undefined
          ? { propuesta: this.emptyToNull(dto.propuesta) }
          : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.observacion !== undefined
          ? { observacion: this.emptyToNull(dto.observacion) }
          : {}),
      },
      select: listaSelect,
    });

    await this.audit(AuditTabla.LISTAS_ELECTORALES, AuditOperacion.UPDATE, lista.id, {
      datosAnteriores: before,
      datosNuevos: lista,
      actor,
    });

    return lista;
  }

  async listCandidaturas(eleccionId: string, query: QueryCandidaturasDto) {
    await this.ensureEleccion(eleccionId);
    await this.expirarSubsanacionesVencidas(eleccionId);
    const { page, limit, search, dignidadId, listaId, estado } = query;
    const where: Prisma.CandidaturaWhereInput = { eleccionId };
    if (dignidadId) where.dignidadId = dignidadId;
    if (listaId) where.listaId = listaId;
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { elector: { is: { identificacion: { contains: search, mode: 'insensitive' } } } },
        { elector: { is: { nombres: { contains: search, mode: 'insensitive' } } } },
        { elector: { is: { apellidos: { contains: search, mode: 'insensitive' } } } },
        { dignidad: { is: { nombre: { contains: search, mode: 'insensitive' } } } },
        { lista: { is: { nombre: { contains: search, mode: 'insensitive' } } } },
        { lista: { is: { codigo: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.candidatura.findMany({
        where,
        select: candidaturaSelect,
        orderBy: [
          { dignidad: { orden: 'asc' } },
          { orden: 'asc' },
          { elector: { apellidos: 'asc' } },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.candidatura.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async createCandidatura(
    eleccionId: string,
    dto: CreateCandidaturaDto,
    actor: Actor,
  ) {
    await this.ensureCanEdit(eleccionId);
    await this.validateCandidatura(eleccionId, dto.dignidadId, dto.electorId, dto.listaId);

    const candidatura = await this.prisma.candidatura.create({
      data: {
        eleccionId,
        dignidadId: dto.dignidadId,
        electorId: dto.electorId,
        listaId: dto.listaId || null,
        orden: dto.orden ?? 0,
      },
      select: candidaturaSelect,
    });

    await this.audit(AuditTabla.CANDIDATURAS, AuditOperacion.CREATE, candidatura.id, {
      datosNuevos: candidatura,
      actor,
    });

    return candidatura;
  }

  async updateCandidatura(
    eleccionId: string,
    candidaturaId: string,
    dto: UpdateCandidaturaDto,
    actor: Actor,
  ) {
    await this.ensureCanEdit(eleccionId);
    const before = await this.findCandidaturaOrFail(eleccionId, candidaturaId);

    if (dto.listaId !== undefined) {
      await this.validateCandidatura(
        eleccionId,
        before.dignidadId,
        before.electorId,
        dto.listaId,
        candidaturaId,
      );
    }

    const candidatura = await this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: {
        ...(dto.listaId !== undefined ? { listaId: dto.listaId || null } : {}),
        ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.observacion !== undefined
          ? { observacion: this.emptyToNull(dto.observacion) }
          : {}),
      },
      select: candidaturaSelect,
    });

    await this.audit(AuditTabla.CANDIDATURAS, AuditOperacion.UPDATE, candidatura.id, {
      datosAnteriores: before,
      datosNuevos: candidatura,
      actor,
    });

    return candidatura;
  }

  async calificarCandidatura(
    eleccionId: string,
    candidaturaId: string,
    dto: CalificarCandidaturaDto,
    actor: Actor,
  ) {
    await this.ensureCanEdit(eleccionId);
    if (dto.estado === EstadoCandidatura.INSCRITA) {
      throw new BadRequestException('La calificacion debe aprobar, observar, rechazar o retirar la candidatura.');
    }

    await this.expirarSubsanacionesVencidas(eleccionId);
    const before = await this.findCandidaturaOrFail(eleccionId, candidaturaId);
    const candidatura = await this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: {
        estado: dto.estado,
        observacion: this.emptyToNull(dto.observacion),
        plazoSubsanacionAt:
          dto.estado === EstadoCandidatura.OBSERVADA
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null,
        ...(dto.cumpleAprobadoCarrera !== undefined
          ? { cumpleAprobadoCarrera: dto.cumpleAprobadoCarrera }
          : {}),
        ...(dto.cumplePromedioAcademico !== undefined
          ? { cumplePromedioAcademico: dto.cumplePromedioAcademico }
          : {}),
        ...(dto.sancionado !== undefined ? { sancionado: dto.sancionado } : {}),
      },
      select: candidaturaSelect,
    });

    await this.audit(AuditTabla.CANDIDATURAS, AuditOperacion.ESTADO, candidatura.id, {
      datosAnteriores: { estado: before.estado, observacion: before.observacion },
      datosNuevos: { estado: candidatura.estado, observacion: candidatura.observacion },
      actor,
    });

    return candidatura;
  }

  /**
   * Art. 13: el postulante tiene 24 horas desde que la candidatura queda
   * OBSERVADA para subsanar la documentacion; de lo contrario queda
   * descalificado automaticamente (ver expirarSubsanacionesVencidas).
   */
  async subsanarCandidatura(
    eleccionId: string,
    candidaturaId: string,
    dto: SubsanarCandidaturaDto,
    actor: Actor,
  ) {
    await this.expirarSubsanacionesVencidas(eleccionId);
    const before = await this.findCandidaturaOrFail(eleccionId, candidaturaId);
    if (before.estado !== EstadoCandidatura.OBSERVADA) {
      throw new BadRequestException(
        'Solo se puede subsanar una candidatura observada.',
      );
    }

    const candidatura = await this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: {
        estado: EstadoCandidatura.INSCRITA,
        observacion: this.emptyToNull(dto.observacion) ?? before.observacion,
        plazoSubsanacionAt: null,
      },
      select: candidaturaSelect,
    });

    await this.audit(AuditTabla.CANDIDATURAS, AuditOperacion.ESTADO, candidatura.id, {
      datosAnteriores: { estado: before.estado },
      datosNuevos: { estado: candidatura.estado, observacion: candidatura.observacion },
      actor,
    });

    return candidatura;
  }

  /**
   * Art. 14: una candidatura o lista no calificada (RECHAZADA) puede
   * impugnar esa resolucion. La respuesta del Consejo Electoral es de
   * ultima instancia.
   */
  async impugnarCalificacion(
    eleccionId: string,
    candidaturaId: string,
    dto: ImpugnarCalificacionDto,
    actor: Actor,
  ) {
    await this.expirarSubsanacionesVencidas(eleccionId);
    const candidatura = await this.findCandidaturaOrFail(eleccionId, candidaturaId);
    if (candidatura.estado !== EstadoCandidatura.RECHAZADA) {
      throw new BadRequestException(
        'Solo se puede impugnar la calificacion de una candidatura rechazada.',
      );
    }

    const impugnacion = await this.prisma.impugnacionCandidatura.create({
      data: {
        eleccionId,
        candidaturaId,
        presentadoPor: dto.presentadoPor.trim(),
        correoNotificacion: dto.correoNotificacion.trim(),
        fundamento: dto.fundamento.trim(),
      },
    });

    await this.audit(
      AuditTabla.CANDIDATURAS,
      AuditOperacion.CREATE,
      impugnacion.id,
      { datosNuevos: impugnacion, actor },
    );

    return impugnacion;
  }

  async resolverImpugnacionCalificacion(
    impugnacionId: string,
    dto: ResolverImpugnacionCandidaturaDto,
    actor: Actor,
  ) {
    if (dto.estado === EstadoImpugnacionResultado.PENDIENTE) {
      throw new BadRequestException('La resolucion debe aceptar o rechazar la impugnacion.');
    }
    const before = await this.prisma.impugnacionCandidatura.findUnique({
      where: { id: impugnacionId },
    });
    if (!before) {
      throw new NotFoundException('Impugnacion no encontrada.');
    }

    const impugnacion = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.impugnacionCandidatura.update({
        where: { id: impugnacionId },
        data: {
          estado: dto.estado,
          resolucion: dto.resolucion.trim(),
          fechaResolucion: new Date(),
        },
      });
      if (dto.estado === EstadoImpugnacionResultado.ACEPTADA) {
        await tx.candidatura.update({
          where: { id: updated.candidaturaId },
          data: { estado: EstadoCandidatura.CALIFICADA, plazoSubsanacionAt: null },
        });
      }
      return updated;
    });

    await this.audit(
      AuditTabla.CANDIDATURAS,
      AuditOperacion.ESTADO,
      impugnacionId,
      {
        datosAnteriores: { estado: before.estado },
        datosNuevos: { estado: impugnacion.estado, resolucion: impugnacion.resolucion },
        actor,
      },
    );

    return impugnacion;
  }

  /**
   * Art. 12: las candidaturas se presentan en lista respetando la equidad
   * de genero. Se exige un minimo del 40% de representacion de cada genero
   * declarado entre los integrantes vigentes de la lista.
   */
  private async validarParidadGenero(listaId: string) {
    const candidaturas = await this.prisma.candidatura.findMany({
      where: {
        listaId,
        estado: { not: EstadoCandidatura.RETIRADA },
      },
      select: { elector: { select: { genero: true } } },
    });
    if (candidaturas.length < 2) return;

    const sinGenero = candidaturas.some((item) => !item.elector.genero);
    if (sinGenero) {
      throw new BadRequestException(
        'Todos los integrantes de la lista deben tener el genero registrado antes de calificarla (Art. 12, equidad de genero).',
      );
    }

    const total = candidaturas.length;
    const conteo = new Map<string, number>();
    for (const item of candidaturas) {
      const genero = item.elector.genero as string;
      conteo.set(genero, (conteo.get(genero) ?? 0) + 1);
    }
    const maximoPermitido = Math.ceil(total * 0.6);
    const generoDominante = [...conteo.values()].some(
      (cantidad) => cantidad > maximoPermitido,
    );
    if (conteo.size < 2 || generoDominante) {
      throw new BadRequestException(
        `La lista no cumple la equidad de genero exigida (Art. 12): ningun genero puede superar el ${Math.round((maximoPermitido / total) * 100)}% de los integrantes.`,
      );
    }
  }

  private async expirarSubsanacionesVencidas(eleccionId: string) {
    await this.prisma.candidatura.updateMany({
      where: {
        eleccionId,
        estado: EstadoCandidatura.OBSERVADA,
        plazoSubsanacionAt: { lt: new Date() },
      },
      data: { estado: EstadoCandidatura.RECHAZADA },
    });
  }

  private async getEleccion(eleccionId: string) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: { id: true, estado: true },
    });
    if (!eleccion) throw new NotFoundException('Eleccion no encontrada.');
    return eleccion;
  }

  private async ensureEleccion(eleccionId: string) {
    await this.getEleccion(eleccionId);
  }

  private async ensureCanEdit(eleccionId: string) {
    const eleccion = await this.getEleccion(eleccionId);
    if (eleccion.estado !== EstadoEleccion.CANDIDATURAS_ABIERTAS) {
      throw new BadRequestException(
        'Las candidaturas solo se gestionan cuando la eleccion esta en candidaturas abiertas.',
      );
    }
  }

  private async findListaOrFail(eleccionId: string, listaId: string) {
    const lista = await this.prisma.listaElectoral.findFirst({
      where: { id: listaId, eleccionId },
      select: listaSelect,
    });
    if (!lista) throw new NotFoundException('Lista no encontrada.');
    return lista;
  }

  async listDignidadesPorLista(eleccionId: string, listaId: string) {
    await this.ensureEleccion(eleccionId);
    await this.findListaOrFail(eleccionId, listaId);

    const [dignidades, estados] = await Promise.all([
      this.prisma.dignidad.findMany({
        where: { eleccionId, activo: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true, orden: true },
      }),
      this.prisma.listaDignidadEstado.findMany({
        where: { listaId },
        select: { dignidadId: true, habilitado: true },
      }),
    ]);

    const estadoPorDignidad = new Map(
      estados.map((estado) => [estado.dignidadId, estado.habilitado]),
    );

    return dignidades.map((dignidad) => ({
      ...dignidad,
      habilitado: estadoPorDignidad.get(dignidad.id) ?? true,
    }));
  }

  async setDignidadHabilitadaEnLista(
    eleccionId: string,
    listaId: string,
    dignidadId: string,
    dto: SetDignidadListaEstadoDto,
    actor: Actor,
  ) {
    await this.ensureCanEdit(eleccionId);
    await this.findListaOrFail(eleccionId, listaId);

    const dignidad = await this.prisma.dignidad.findFirst({
      where: { id: dignidadId, eleccionId },
      select: { id: true },
    });
    if (!dignidad) throw new NotFoundException('Dignidad no encontrada.');

    const estado = await this.prisma.listaDignidadEstado.upsert({
      where: { listaId_dignidadId: { listaId, dignidadId } },
      update: { habilitado: dto.habilitado },
      create: { listaId, dignidadId, habilitado: dto.habilitado },
      select: { id: true, listaId: true, dignidadId: true, habilitado: true },
    });

    await this.audit(AuditTabla.CANDIDATURAS, AuditOperacion.UPDATE, estado.id, {
      datosNuevos: estado,
      actor,
    });

    return estado;
  }

  private async findCandidaturaOrFail(eleccionId: string, candidaturaId: string) {
    const candidatura = await this.prisma.candidatura.findFirst({
      where: { id: candidaturaId, eleccionId },
      select: candidaturaSelect,
    });
    if (!candidatura) throw new NotFoundException('Candidatura no encontrada.');
    return candidatura;
  }

  private async validateCandidatura(
    eleccionId: string,
    dignidadId: string,
    electorId: string,
    listaId?: string | null,
    candidaturaActualId?: string,
  ) {
    const dignidad = await this.prisma.dignidad.findFirst({
      where: { id: dignidadId, eleccionId, activo: true },
      select: {
        id: true,
        nombre: true,
        tipoElectorPermitido: true,
        requiereLista: true,
      },
    });
    if (!dignidad) throw new BadRequestException('La dignidad no pertenece a la eleccion o esta inactiva.');

    const padron = await this.prisma.padronElectoral.findFirst({
      where: {
        eleccionId,
        electorId,
        estado: EstadoPadronElector.HABILITADO,
        publicado: true,
        elector: { activo: true },
      },
      select: {
        elector: { select: { tipo: true, identificacion: true } },
      },
    });
    if (!padron) {
      throw new BadRequestException('El candidato debe estar en el padron publicado y habilitado.');
    }

    if (
      dignidad.tipoElectorPermitido !== TipoElector.AMBOS &&
      padron.elector.tipo !== dignidad.tipoElectorPermitido
    ) {
      throw new BadRequestException(
        'El tipo de elector del candidato no corresponde a la dignidad.',
      );
    }

    if (dignidad.requiereLista && !listaId) {
      throw new BadRequestException('Esta dignidad requiere una lista electoral.');
    }

    if (listaId) {
      const lista = await this.prisma.listaElectoral.findFirst({
        where: { id: listaId, eleccionId },
        select: { id: true, estado: true },
      });
      if (!lista) throw new BadRequestException('La lista no pertenece a la eleccion.');
      if (lista.estado === 'RECHAZADA' || lista.estado === 'RETIRADA') {
        throw new BadRequestException('La lista seleccionada no esta habilitada.');
      }

      const dignidadListaEstado = await this.prisma.listaDignidadEstado.findUnique({
        where: { listaId_dignidadId: { listaId, dignidadId } },
        select: { habilitado: true },
      });
      if (dignidadListaEstado && !dignidadListaEstado.habilitado) {
        throw new BadRequestException(
          'La dignidad esta inhabilitada para la lista seleccionada.',
        );
      }
    }

    const duplicated = await this.prisma.candidatura.findFirst({
      where: {
        eleccionId,
        electorId,
        estado: { not: EstadoCandidatura.RETIRADA },
        ...(candidaturaActualId ? { id: { not: candidaturaActualId } } : {}),
      },
      select: { id: true },
    });
    if (duplicated) {
      throw new BadRequestException('El elector ya tiene una candidatura registrada en esta eleccion.');
    }
  }

  private emptyToNull(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
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
