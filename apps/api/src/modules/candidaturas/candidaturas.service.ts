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
  QueryCandidaturasDto,
  UpdateCandidaturaDto,
} from './dto/candidatura.dto';
import {
  CreateListaDto,
  QueryListasDto,
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
      facultad: true,
      carrera: true,
      curso: true,
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

    const pendientes = await this.prisma.candidatura.count({
      where: { eleccionId, estado: EstadoCandidatura.INSCRITA },
    });
    if (pendientes) {
      throw new BadRequestException(
        'Existen candidaturas inscritas pendientes de calificar o rechazar.',
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
      throw new BadRequestException('La calificacion debe aprobar, rechazar o retirar la candidatura.');
    }

    const before = await this.findCandidaturaOrFail(eleccionId, candidaturaId);
    const candidatura = await this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: {
        estado: dto.estado,
        observacion: this.emptyToNull(dto.observacion),
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