import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { Prisma } from 'prisma/generated/client';
import { Rol } from 'prisma/generated/enums';
import {
  AuditOperacion,
  AuditTabla,
} from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuthUser } from '../auth/entities/auth.entity';
import { PrismaService } from 'src/prisma';
import {
  CreateUserDto,
  QueryUsersDto,
  UpdateUserDto,
} from './dto/user.dto';

const userSelect = {
  id: true,
  usuario: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  cambiarPassword: true,
  fechaCaducidad: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UsuarioSelect;

interface Actor {
  user: AuthUser;
  ip?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const { page, limit, search, rol, activo } = query;

    const where: Prisma.UsuarioWhereInput = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo;
    if (search) {
      where.OR = [
        { usuario: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usuario.count({ where }),
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
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return user;
  }

  async create(dto: CreateUserDto, actor: Actor) {
    const passwordHash = await hash(dto.password, 12);

    const user = await this.prisma.usuario.create({
      data: {
        usuario: dto.usuario,
        nombre: dto.nombre,
        email: dto.email,
        password: passwordHash,
        rol: dto.rol ?? Rol.USER,
        activo: true,
        // Contraseña temporal: el usuario debe cambiarla en el primer ingreso.
        cambiarPassword: true,
      },
      select: userSelect,
    });

    await this.auditoria.registrar({
      tabla: AuditTabla.USUARIOS,
      operacion: AuditOperacion.CREATE,
      registroId: user.id,
      datosNuevos: user,
      usuario: actor.user.usuario,
      ip: actor.ip,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    const before = await this.findOne(id);

    // Evita que un admin se quite a sí mismo el rol de administrador.
    if (id === actor.user.id && dto.rol && dto.rol !== before.rol) {
      throw new BadRequestException('No puedes cambiar tu propio rol.');
    }

    const user = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.rol !== undefined ? { rol: dto.rol } : {}),
      },
      select: userSelect,
    });

    await this.auditoria.registrar({
      tabla: AuditTabla.USUARIOS,
      operacion: AuditOperacion.UPDATE,
      registroId: id,
      datosAnteriores: before,
      datosNuevos: user,
      usuario: actor.user.usuario,
      ip: actor.ip,
    });

    return user;
  }

  async setActivo(id: string, activo: boolean, actor: Actor) {
    if (id === actor.user.id && !activo) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta.');
    }

    const before = await this.findOne(id);
    if (before.activo === activo) {
      return before;
    }

    const user = await this.prisma.usuario.update({
      where: { id },
      data: { activo },
      select: userSelect,
    });

    await this.auditoria.registrar({
      tabla: AuditTabla.USUARIOS,
      operacion: AuditOperacion.ESTADO,
      registroId: id,
      datosAnteriores: { activo: before.activo },
      datosNuevos: { activo: user.activo },
      usuario: actor.user.usuario,
      ip: actor.ip,
    });

    return user;
  }

  async resetPassword(id: string, password: string, actor: Actor) {
    const before = await this.findOne(id);

    const passwordHash = await hash(password, 12);
    const user = await this.prisma.usuario.update({
      where: { id },
      data: {
        password: passwordHash,
        // Forzar cambio en el próximo inicio de sesión.
        cambiarPassword: true,
        fechaCaducidad: null,
      },
      select: userSelect,
    });

    await this.auditoria.registrar({
      tabla: AuditTabla.USUARIOS,
      operacion: AuditOperacion.RESET,
      registroId: id,
      datosNuevos: { usuario: before.usuario, cambiarPassword: true },
      usuario: actor.user.usuario,
      ip: actor.ip,
    });

    return user;
  }
}
