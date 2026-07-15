import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { randomInt } from 'crypto';
import { Prisma } from 'prisma/generated/client';
import {
  EstadoEleccion,
  EstadoPadronElector,
  TipoElector,
} from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import { AuditOperacion, AuditTabla } from '../auditoria/auditoria.constants';
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
  fotoUrl: true,
  tipo: true,
  carreraId: true,
  nivelId: true,
  carrera: { select: { id: true, nombre: true, orden: true } },
  nivel: { select: { id: true, nombre: true, orden: true } },
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
        {
          carrera: {
            is: { nombre: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          nivel: {
            is: { nombre: { contains: search, mode: 'insensitive' } },
          },
        },
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
    await this.validateCatalogos(dto.carreraId, dto.nivelId);
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
    await this.validateCatalogos(dto.carreraId, dto.nivelId);
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
        ...(dto.email !== undefined
          ? { email: this.emptyToNull(dto.email) }
          : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.carreraId !== undefined ? { carreraId: dto.carreraId } : {}),
        ...(dto.nivelId !== undefined ? { nivelId: dto.nivelId } : {}),
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

  async updateFotoElector(
    id: string,
    foto: { buffer: Buffer; mimetype: string; size: number },
    actor: Actor,
  ) {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(foto.mimetype)) {
      throw new BadRequestException('La foto debe ser JPG, PNG o WebP.');
    }
    if (!foto.size || foto.size > 2 * 1024 * 1024) {
      throw new BadRequestException('La foto no puede superar los 2 MB.');
    }

    const before = await this.findElectorOrFail(id);
    const fotoUrl = `data:${foto.mimetype};base64,${foto.buffer.toString('base64')}`;
    const elector = await this.prisma.elector.update({
      where: { id },
      data: { fotoUrl },
      select: electorSelect,
    });

    await this.audit(AuditTabla.ELECTORES, AuditOperacion.UPDATE, elector.id, {
      datosAnteriores: { tieneFoto: !!before.fotoUrl },
      datosNuevos: {
        tieneFoto: true,
        tipoArchivo: foto.mimetype,
        tamanoBytes: foto.size,
      },
      actor,
    });

    return elector;
  }

  async deleteFotoElector(id: string, actor: Actor) {
    const before = await this.findElectorOrFail(id);
    const elector = await this.prisma.elector.update({
      where: { id },
      data: { fotoUrl: null },
      select: electorSelect,
    });

    await this.audit(AuditTabla.ELECTORES, AuditOperacion.UPDATE, elector.id, {
      datosAnteriores: { tieneFoto: !!before.fotoUrl },
      datosNuevos: { tieneFoto: false },
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
        {
          carrera: {
            is: { nombre: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          nivel: {
            is: { nombre: { contains: search, mode: 'insensitive' } },
          },
        },
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
      throw new BadRequestException(
        'No hay electores activos para generar el padron.',
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
      datosNuevos: {
        autogenerados: result.count,
        totalElegibles: electores.length,
      },
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
      throw new BadRequestException(
        'No hay electores habilitados para publicar.',
      );
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

      // Generar credenciales de votacion (DNI + clave) para habilitados sin clave.
      const sinCredencial = await tx.padronElectoral.findMany({
        where: {
          eleccionId,
          estado: EstadoPadronElector.HABILITADO,
          credencialHash: null,
        },
        select: { id: true },
      });
      for (const row of sinCredencial) {
        const clave = this.generarCredencial();
        await tx.padronElectoral.update({
          where: { id: row.id },
          data: {
            credencialHash: hashSync(clave, 10),
            credencialTemporal: clave,
            credencialGeneradaAt: now,
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

  async listCredenciales(eleccionId: string) {
    await this.ensureEleccion(eleccionId);
    const data = await this.prisma.padronElectoral.findMany({
      where: { eleccionId, credencialHash: { not: null } },
      orderBy: [
        { elector: { apellidos: 'asc' } },
        { elector: { nombres: 'asc' } },
      ],
      select: {
        id: true,
        credencialTemporal: true,
        credencialGeneradaAt: true,
        elector: {
          select: {
            identificacion: true,
            nombres: true,
            apellidos: true,
            email: true,
          },
        },
      },
    });
    return data.map((row) => ({
      padronId: row.id,
      identificacion: row.elector.identificacion,
      nombres: row.elector.nombres,
      apellidos: row.elector.apellidos,
      email: row.elector.email,
      credencial: row.credencialTemporal,
      generadaAt: row.credencialGeneradaAt,
    }));
  }

  async regenerarCredencial(
    eleccionId: string,
    padronId: string,
    actor: Actor,
  ) {
    const padron = await this.findPadronOrFail(eleccionId, padronId);
    const clave = this.generarCredencial();
    await this.prisma.padronElectoral.update({
      where: { id: padronId },
      data: {
        credencialHash: hashSync(clave, 10),
        credencialTemporal: clave,
        credencialGeneradaAt: new Date(),
      },
    });

    await this.audit(AuditTabla.PADRONES, AuditOperacion.UPDATE, padronId, {
      datosAnteriores: { electorId: padron.electorId },
      datosNuevos: { credencialRegenerada: true },
      actor,
    });

    return { identificacion: padron.elector.identificacion, credencial: clave };
  }

  private generarCredencial(): string {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let clave = '';
    for (let i = 0; i < 8; i++) {
      clave += alfabeto[randomInt(alfabeto.length)];
    }
    return clave;
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
      carreraId: dto.carreraId ?? null,
      nivelId: dto.nivelId ?? null,
    };
  }

  async catalogos() {
    const [carreras, niveles] = await Promise.all([
      this.prisma.carrera.findMany({
        where: { activo: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true, orden: true },
      }),
      this.prisma.nivel.findMany({
        where: { activo: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true, orden: true },
      }),
    ]);
    return { carreras, niveles };
  }

  private async validateCatalogos(
    carreraId?: string | null,
    nivelId?: string | null,
  ) {
    if (carreraId) {
      const carrera = await this.prisma.carrera.findFirst({
        where: { id: carreraId, activo: true },
        select: { id: true },
      });
      if (!carrera) throw new BadRequestException('La carrera seleccionada no es valida.');
    }
    if (nivelId) {
      const nivel = await this.prisma.nivel.findFirst({
        where: { id: nivelId, activo: true },
        select: { id: true },
      });
      if (!nivel) throw new BadRequestException('El nivel seleccionado no es valido.');
    }
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
