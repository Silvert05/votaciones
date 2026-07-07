import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { Rol, TipoOpcion } from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import {
  AuditOperacion,
  AuditTabla,
} from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuthUser } from '../auth/entities/auth.entity';
import {
  CreateOpcionDto,
  UpdateOpcionDto,
} from './dto/opcion.dto';
import {
  CreatePerfilDto,
  UpdatePerfilDto,
} from './dto/perfil.dto';

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

export interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'group' | 'basic';
  icon?: string;
  link?: string;
  children?: MenuItem[];
}

export interface UserAccess {
  perfil: { id: string; nombre: string } | null;
  menu: MenuItem[];
  rutasPermitidas: string[];
  codigosPermitidos: string[];
}

const opcionSelect = {
  id: true,
  codigo: true,
  titulo: true,
  subtitulo: true,
  ruta: true,
  icono: true,
  tipo: true,
  orden: true,
  activo: true,
  padreId: true,
  padre: {
    select: {
      id: true,
      titulo: true,
      codigo: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OpcionSelect;

const perfilSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      opciones: true,
      usuarios: true,
    },
  },
} satisfies Prisma.PerfilSelect;

@Injectable()
export class SeguridadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listOpciones() {
    return this.prisma.opcion.findMany({
      select: opcionSelect,
      orderBy: [{ padreId: 'asc' }, { orden: 'asc' }, { titulo: 'asc' }],
    });
  }

  async createOpcion(dto: CreateOpcionDto, actor: Actor) {
    await this.validatePadre(dto.padreId ?? null);

    const opcion = await this.prisma.opcion.create({
      data: {
        codigo: dto.codigo,
        titulo: dto.titulo,
        subtitulo: this.emptyToNull(dto.subtitulo),
        ruta: this.emptyToNull(dto.ruta),
        icono: this.emptyToNull(dto.icono),
        tipo: dto.tipo ?? TipoOpcion.PANTALLA,
        orden: dto.orden ?? 0,
        padreId: this.emptyToNull(dto.padreId),
      },
      select: opcionSelect,
    });

    await this.audit(AuditTabla.OPCIONES, AuditOperacion.CREATE, opcion.id, {
      datosNuevos: opcion,
      actor,
    });

    return opcion;
  }

  async updateOpcion(id: string, dto: UpdateOpcionDto, actor: Actor) {
    const before = await this.findOpcionOrFail(id);
    if (dto.padreId === id) {
      throw new BadRequestException('Una opcion no puede ser padre de si misma.');
    }
    if (dto.padreId !== undefined) {
      await this.validatePadre(dto.padreId);
    }

    const opcion = await this.prisma.opcion.update({
      where: { id },
      data: {
        ...(dto.codigo !== undefined ? { codigo: dto.codigo } : {}),
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.subtitulo !== undefined
          ? { subtitulo: this.emptyToNull(dto.subtitulo) }
          : {}),
        ...(dto.ruta !== undefined ? { ruta: this.emptyToNull(dto.ruta) } : {}),
        ...(dto.icono !== undefined ? { icono: this.emptyToNull(dto.icono) } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
        ...(dto.padreId !== undefined
          ? { padreId: this.emptyToNull(dto.padreId) }
          : {}),
      },
      select: opcionSelect,
    });

    await this.audit(AuditTabla.OPCIONES, AuditOperacion.UPDATE, id, {
      datosAnteriores: before,
      datosNuevos: opcion,
      actor,
    });

    return opcion;
  }

  async setOpcionActivo(id: string, activo: boolean, actor: Actor) {
    const before = await this.findOpcionOrFail(id);
    if (before.activo === activo) {
      return before;
    }

    const opcion = await this.prisma.opcion.update({
      where: { id },
      data: { activo },
      select: opcionSelect,
    });

    await this.audit(AuditTabla.OPCIONES, AuditOperacion.ESTADO, id, {
      datosAnteriores: { activo: before.activo },
      datosNuevos: { activo: opcion.activo },
      actor,
    });

    return opcion;
  }

  async listPerfiles() {
    return this.prisma.perfil.findMany({
      select: perfilSelect,
      orderBy: { nombre: 'asc' },
    });
  }

  async getPerfil(id: string) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id },
      select: {
        ...perfilSelect,
        opciones: {
          select: {
            opcionId: true,
          },
        },
      },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado.');
    }

    return {
      ...perfil,
      opcionIds: perfil.opciones.map((opcion) => opcion.opcionId),
    };
  }

  async createPerfil(dto: CreatePerfilDto, actor: Actor) {
    const perfil = await this.prisma.perfil.create({
      data: {
        nombre: dto.nombre,
        descripcion: this.emptyToNull(dto.descripcion),
      },
      select: perfilSelect,
    });

    await this.audit(AuditTabla.PERFILES, AuditOperacion.CREATE, perfil.id, {
      datosNuevos: perfil,
      actor,
    });

    return perfil;
  }

  async updatePerfil(id: string, dto: UpdatePerfilDto, actor: Actor) {
    const before = await this.findPerfilOrFail(id);
    const perfil = await this.prisma.perfil.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: this.emptyToNull(dto.descripcion) }
          : {}),
      },
      select: perfilSelect,
    });

    await this.audit(AuditTabla.PERFILES, AuditOperacion.UPDATE, id, {
      datosAnteriores: before,
      datosNuevos: perfil,
      actor,
    });

    return perfil;
  }

  async setPerfilActivo(id: string, activo: boolean, actor: Actor) {
    const before = await this.findPerfilOrFail(id);
    if (before.activo === activo) {
      return before;
    }

    const perfil = await this.prisma.perfil.update({
      where: { id },
      data: { activo },
      select: perfilSelect,
    });

    await this.audit(AuditTabla.PERFILES, AuditOperacion.ESTADO, id, {
      datosAnteriores: { activo: before.activo },
      datosNuevos: { activo: perfil.activo },
      actor,
    });

    return perfil;
  }

  async setPerfilOpciones(id: string, opcionIds: string[], actor: Actor) {
    const before = await this.getPerfil(id);
    const count = await this.prisma.opcion.count({
      where: { id: { in: opcionIds } },
    });

    if (count !== opcionIds.length) {
      throw new BadRequestException('Una o mas opciones no existen.');
    }

    await this.prisma.$transaction([
      this.prisma.perfilOpcion.deleteMany({ where: { perfilId: id } }),
      ...(opcionIds.length
        ? [
            this.prisma.perfilOpcion.createMany({
              data: opcionIds.map((opcionId) => ({
                perfilId: id,
                opcionId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    const perfil = await this.getPerfil(id);

    await this.audit(AuditTabla.PERFILES, AuditOperacion.UPDATE, id, {
      datosAnteriores: { opcionIds: before.opcionIds },
      datosNuevos: { opcionIds: perfil.opcionIds },
      actor,
    });

    return perfil;
  }

  async getAccessForUser(userId: string, rol?: Rol): Promise<UserAccess> {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        rol: true,
        perfil: {
          select: {
            id: true,
            nombre: true,
            activo: true,
            opciones: {
              select: {
                opcion: {
                  select: {
                    id: true,
                    codigo: true,
                    titulo: true,
                    subtitulo: true,
                    ruta: true,
                    icono: true,
                    tipo: true,
                    orden: true,
                    activo: true,
                    padreId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return this.emptyAccess();
    }

    const currentRol = rol ?? user.rol;
    const perfilActivo = user.perfil?.activo ? user.perfil : null;
    const opciones =
      currentRol === Rol.ADMIN
        ? await this.getAllActiveOpciones()
        : (perfilActivo?.opciones
            .map(({ opcion }) => opcion)
            .filter((opcion) => opcion.activo) ?? []);

    return {
      perfil: perfilActivo
        ? { id: perfilActivo.id, nombre: perfilActivo.nombre }
        : null,
      menu: this.buildMenu(opciones),
      rutasPermitidas: opciones
        .map((opcion) => opcion.ruta)
        .filter((ruta): ruta is string => !!ruta),
      codigosPermitidos: opciones.map((opcion) => opcion.codigo),
    };
  }

  private async getAllActiveOpciones() {
    return this.prisma.opcion.findMany({
      where: { activo: true },
      orderBy: [{ padreId: 'asc' }, { orden: 'asc' }, { titulo: 'asc' }],
    });
  }

  private buildMenu(
    opciones: Array<{
      id: string;
      codigo: string;
      titulo: string;
      subtitulo: string | null;
      ruta: string | null;
      icono: string | null;
      tipo: TipoOpcion;
      orden: number;
      padreId: string | null;
    }>,
  ): MenuItem[] {
    const byId = new Map<string, MenuItem & { orden: number; padreId: string | null }>();
    const roots: Array<MenuItem & { orden: number; padreId: string | null }> = [];

    for (const opcion of opciones) {
      byId.set(opcion.id, {
        id: opcion.codigo,
        title: opcion.titulo,
        ...(opcion.subtitulo ? { subtitle: opcion.subtitulo } : {}),
        type: opcion.tipo === TipoOpcion.GRUPO ? 'group' : 'basic',
        ...(opcion.icono ? { icon: opcion.icono } : {}),
        ...(opcion.ruta ? { link: opcion.ruta } : {}),
        children: [],
        orden: opcion.orden,
        padreId: opcion.padreId,
      });
    }

    for (const item of byId.values()) {
      if (item.padreId && byId.has(item.padreId)) {
        byId.get(item.padreId)!.children!.push(item);
      } else {
        roots.push(item);
      }
    }

    const sortAndClean = (
      items: Array<MenuItem & { orden: number; padreId: string | null }>,
    ): MenuItem[] =>
      items
        .sort((a, b) => a.orden - b.orden || a.title.localeCompare(b.title))
        .map(({ orden: _orden, padreId: _padreId, children, ...item }) => {
          const sortedChildren = children?.length
            ? sortAndClean(children as Array<MenuItem & { orden: number; padreId: string | null }>)
            : undefined;
          return {
            ...item,
            ...(sortedChildren?.length ? { children: sortedChildren } : {}),
          };
        });

    return sortAndClean(roots);
  }

  private async findOpcionOrFail(id: string) {
    const opcion = await this.prisma.opcion.findUnique({
      where: { id },
      select: opcionSelect,
    });
    if (!opcion) {
      throw new NotFoundException('Opcion no encontrada.');
    }
    return opcion;
  }

  private async findPerfilOrFail(id: string) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id },
      select: perfilSelect,
    });
    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado.');
    }
    return perfil;
  }

  private async validatePadre(padreId?: string | null) {
    if (!padreId) {
      return;
    }

    const padre = await this.prisma.opcion.findUnique({
      where: { id: padreId },
      select: { id: true },
    });
    if (!padre) {
      throw new BadRequestException('La opcion padre no existe.');
    }
  }

  private emptyToNull(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private emptyAccess(): UserAccess {
    return {
      perfil: null,
      menu: [],
      rutasPermitidas: [],
      codigosPermitidos: [],
    };
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
