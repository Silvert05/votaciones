import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import {
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
  CreateElectorDto,
  QueryElectoresDto,
  UpdateElectorDto,
} from './dto/elector.dto';
import {
  AsignarElectoresDto,
  QueryPadronDto,
  UpdatePadronElectorDto,
} from './dto/padron.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

const electorSelect = {
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
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ElectorSelect;

const padronSelect = {
  id: true,
  eleccionId: true,
  electorId: true,
  estado: true,
  motivo: true,
  observacion: true,
  publicado: true,
  fechaPublicacion: true,
  createdAt: true,
  updatedAt: true,
  elector: { select: electorSelect },
} satisfies Prisma.PadronElectoralSelect;

@Injectable()
export class PadronesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listElectores(query: QueryElectoresDto) {
    const { page, limit, search, tipo, activo } = query;
    const where: Prisma.ElectorWhereInput = {};

    if (tipo) where.tipo = tipo;
    if (activo !== undefined) where.activo = activo;
    if (search) {
      where.OR = [
        { identificacion: { contains: search, mode: 'insensitive' } },
        { nombres: { contains: search, mode: 'insensitive' } },
        { apellidos: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { facultad: { contains: search, mode: 'insensitive' } },
        { carrera: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.elector.findMany({
        where,
        select: electorSelect,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.elector.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createElector(dto: CreateElectorDto, actor: Actor) {
    const elector = await this.prisma.elector.create({
      data: this.toElectorData(dto),
      select: electorSelect,
    });

    await this.audit(AuditTabla.ELECTORES, AuditOperacion.CREATE, elector.id, {
      datosNuevos: elector,
      actor,
    });

    return elector;
  }

  async updateElector(id: string, dto: UpdateElectorDto, actor: Actor) {
    const before = await this.findElectorOrFail(id);
    const elector = await this.prisma.elector.update({
      where: { id },
      data: {
        ...(dto.identificacion !== undefined
          ? { identificacion: dto.identificacion.trim() }
          : {}),
        ...(dto.nombres !== undefined ? { nombres: dto.nombres.trim() } : {}),
        ...(dto.apellidos !== undefined
          ? { apellidos: dto.apellidos.trim() }
          : {}),
        ...(dto.email !== undefined ? { email: this.emptyToNull(dto.email) } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.facultad !== undefined
          ? { facultad: this.emptyToNull(dto.facultad) }
          : {}),
        ...(dto.carrera !== undefined
          ? { carrera: this.emptyToNull(dto.carrera) }
          : {}),
        ...(dto.curso !== undefined ? { curso: this.emptyToNull(dto.curso) } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
      select: electorSelect,
    });

    await this.audit(AuditTabla.ELECTORES, AuditOperacion.UPDATE, elector.id, {
      datosAnteriores: before,
      datosNuevos: elector,
      actor,
    });

    return elector;
  }

  async listPadron(eleccionId: string, query: QueryPadronDto) {
    await this.ensureEleccion(eleccionId);
    const { page, limit, search, estado, tipo } = query;
    const where: Prisma.PadronElectoralWhereInput = { eleccionId };
    const electorWhere: Prisma.ElectorWhereInput = {};

    if (estado) where.estado = estado;
    if (tipo) electorWhere.tipo = tipo;
    if (search) {
      electorWhere.OR = [
        { identificacion: { contains: search, mode: 'insensitive' } },
        { nombres: { contains: search, mode: 'insensitive' } },
        { apellidos: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { facultad: { contains: search, mode: 'insensitive' } },
        { carrera: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (Object.keys(electorWhere).length) {
      where.elector = { is: electorWhere };
    }

    const [data, total] = await Promise.all([
      this.prisma.padronElectoral.findMany({
        where,
        select: padronSelect,
        orderBy: [
          { elector: { apellidos: 'asc' } },
          { elector: { nombres: 'asc' } },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.padronElectoral.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async asignarElectores(
    eleccionId: string,
    dto: AsignarElectoresDto,
    actor: Actor,
  ) {
    await this.ensureEleccion(eleccionId);
    const electores = await this.prisma.elector.findMany({
      where: { id: { in: dto.electorIds }, activo: true },
      select: { id: true },
    });

    if (electores.length !== dto.electorIds.length) {
      throw new BadRequestException(
        'Uno o mas electores no existen o estan inactivos.',
      );
    }

    const result = await this.prisma.padronElectoral.createMany({
      data: electores.map((elector) => ({
        eleccionId,
        electorId: elector.id,
      })),
      skipDuplicates: true,
    });

    await this.audit(AuditTabla.PADRONES, AuditOperacion.CREATE, eleccionId, {
      datosNuevos: { asignados: result.count, electorIds: dto.electorIds },
      actor,
    });

    return { asignados: result.count };
  }

  async autoGenerarPadron(eleccionId: string, actor: Actor) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: {
        id: true,
        dignidades: {
          where: { activo: true },
          select: { tipoElectorPermitido: true },
        },
      },
    });

    if (!eleccion) {
      throw new NotFoundException('Eleccion no encontrada.');
    }

    const tipos = this.tiposPermitidos(eleccion.dignidades);
    const electores = await this.prisma.elector.findMany({
      where: { activo: true, tipo: { in: tipos } },
      select: { id: true },
    });

    if (!electores.length) {
      throw new BadRequestException('No hay electores activos para generar el padron.');
    }

    const result = await this.prisma.padronElectoral.createMany({
      data: electores.map((elector) => ({
        eleccionId,
        electorId: elector.id,
      })),
      skipDuplicates: true,
    });

    await this.audit(AuditTabla.PADRONES, AuditOperacion.CREATE, eleccionId, {
      datosNuevos: { autogenerados: result.count, totalElegibles: electores.length },
      actor,
    });

    return { autogenerados: result.count, totalElegibles: electores.length };
  }

  async updatePadronElector(
    eleccionId: string,
    padronId: string,
    dto: UpdatePadronElectorDto,
    actor: Actor,
  ) {
    const before = await this.findPadronOrFail(eleccionId, padronId);
    const padron = await this.prisma.padronElectoral.update({
      where: { id: padronId },
      data: {
        estado: dto.estado,
        motivo: this.emptyToNull(dto.motivo),
        observacion: this.emptyToNull(dto.observacion),
      },
      select: padronSelect,
    });

    await this.audit(AuditTabla.PADRONES, AuditOperacion.UPDATE, padron.id, {
      datosAnteriores: before,
      datosNuevos: padron,
      actor,
    });

    return padron;
  }

  async publicarPadron(eleccionId: string, actor: Actor) {
    const eleccion = await this.prisma.eleccion.findUnique({
      where: { id: eleccionId },
      select: { id: true, estado: true },
    });

    if (!eleccion) {
      throw new NotFoundException('Eleccion no encontrada.');
    }

    if (
      eleccion.estado !== EstadoEleccion.CONVOCADA &&
      eleccion.estado !== EstadoEleccion.PADRON_PUBLICADO
    ) {
      throw new BadRequestException(
        'El padron solo puede publicarse cuando la eleccion esta convocada.',
      );
    }

    const habilitados = await this.prisma.padronElectoral.count({
      where: { eleccionId, estado: EstadoPadronElector.HABILITADO },
    });

    if (!habilitados) {
      throw new BadRequestException('No hay electores habilitados para publicar.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.padronElectoral.updateMany({
        where: { eleccionId },
        data: { publicado: true, fechaPublicacion: now },
      });

      if (eleccion.estado !== EstadoEleccion.PADRON_PUBLICADO) {
        await tx.eleccion.update({
          where: { id: eleccionId },
          data: { estado: EstadoEleccion.PADRON_PUBLICADO },
        });
        await tx.historialEstadoEleccion.create({
          data: {
            eleccionId,
            estadoAnterior: eleccion.estado,
            estadoNuevo: EstadoEleccion.PADRON_PUBLICADO,
            comentario: 'Publicacion del padron electoral',
            usuario: actor.user.usuario,
          },
        });
      }
    });

    await this.audit(AuditTabla.PADRONES, AuditOperacion.ESTADO, eleccionId, {
      datosAnteriores: { estadoEleccion: eleccion.estado },
      datosNuevos: { publicado: true, habilitados },
      actor,
    });

    return { publicado: true, habilitados };
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

  private async findElectorOrFail(id: string) {
    const elector = await this.prisma.elector.findUnique({
      where: { id },
      select: electorSelect,
    });
    if (!elector) {
      throw new NotFoundException('Elector no encontrado.');
    }
    return elector;
  }

  private async findPadronOrFail(eleccionId: string, padronId: string) {
    const padron = await this.prisma.padronElectoral.findFirst({
      where: { id: padronId, eleccionId },
      select: padronSelect,
    });
    if (!padron) {
      throw new NotFoundException('Registro de padron no encontrado.');
    }
    return padron;
  }

  private tiposPermitidos(
    dignidades: Array<{ tipoElectorPermitido: TipoElector }>,
  ): TipoElector[] {
    if (!dignidades.length) {
      return [TipoElector.DOCENTE, TipoElector.ESTUDIANTE, TipoElector.AMBOS];
    }

    const tipos = new Set<TipoElector>();
    for (const dignidad of dignidades) {
      if (dignidad.tipoElectorPermitido === TipoElector.AMBOS) {
        tipos.add(TipoElector.DOCENTE);
        tipos.add(TipoElector.ESTUDIANTE);
        tipos.add(TipoElector.AMBOS);
      } else {
        tipos.add(dignidad.tipoElectorPermitido);
        tipos.add(TipoElector.AMBOS);
      }
    }
    return [...tipos];
  }

  private toElectorData(dto: CreateElectorDto) {
    return {
      identificacion: dto.identificacion.trim(),
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      email: this.emptyToNull(dto.email),
      tipo: dto.tipo,
      facultad: this.emptyToNull(dto.facultad),
      carrera: this.emptyToNull(dto.carrera),
      curso: this.emptyToNull(dto.curso),
    };
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