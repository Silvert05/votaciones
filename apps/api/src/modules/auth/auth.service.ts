import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { envs } from 'src/config';
import { PrismaService } from 'src/prisma';
import { SeguridadService } from '../seguridad/seguridad.service';
import {
  AuditOperacion,
  AuditTabla,
} from '../auditoria/auditoria.constants';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  ChangePasswordDto,
  LoginDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { AuthUser, JwtPayload } from './entities/auth.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditoria: AuditoriaService,
    private readonly seguridad: SeguridadService,
  ) {}

  /**
   * Login de usuario. Si el usuario debe cambiar la contraseña, devuelve un
   * token temporal de restablecimiento en lugar del token de acceso.
   */
  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { usuario: dto.username },
    });

    if (!user) {
      await this.auditLogin(dto.username, null, false, 'Usuario inexistente', ip);
      throw new UnauthorizedException('Usuario o contraseña inválidos.');
    }

    if (!user.activo) {
      await this.auditLogin(user.usuario, user.id, false, 'Usuario desactivado', ip);
      throw new UnauthorizedException('Usuario desactivado.');
    }

    const passwordMatch = await compare(dto.password, user.password);
    if (!passwordMatch) {
      await this.auditLogin(user.usuario, user.id, false, 'Contraseña incorrecta', ip);
      throw new UnauthorizedException('Usuario o contraseña inválidos.');
    }

    const passwordCaducada =
      !!user.fechaCaducidad && user.fechaCaducidad.getTime() <= Date.now();

    await this.auditLogin(user.usuario, user.id, true, undefined, ip);

    if (user.cambiarPassword || passwordCaducada) {
      return {
        changePassword: true,
        accessToken: this.signResetToken(user.id),
      };
    }

    return this.generateAuthResponse(user);
  }

  /** Registra un evento de cierre de sesión. */
  async auditLogout(user: AuthUser, ip?: string) {
    await this.auditoria.registrar({
      tabla: AuditTabla.AUTH,
      operacion: AuditOperacion.LOGOUT,
      registroId: user.id,
      datosNuevos: { usuario: user.usuario },
      usuario: user.usuario,
      ip,
    });
    return { message: `Sesión cerrada para ${user.usuario}.` };
  }

  private auditLogin(
    usuario: string,
    registroId: string | null,
    exito: boolean,
    motivo: string | undefined,
    ip?: string,
  ) {
    return this.auditoria.registrar({
      tabla: AuditTabla.AUTH,
      operacion: AuditOperacion.LOGIN,
      registroId,
      datosNuevos: { exito, ...(motivo ? { motivo } : {}) },
      usuario,
      ip,
    });
  }

  /**
   * Restablecimiento forzado de contraseña (primer login). Usa el token
   * temporal devuelto por el login. No requiere la contraseña actual.
   */
  async resetPassword(userId: string, dto: ResetPasswordDto, ip?: string) {
    const passwordHash = await hash(dto.newPassword, 12);

    const user = await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        cambiarPassword: false,
        fechaCaducidad: null,
      },
    });

    await this.auditoria.registrar({
      tabla: AuditTabla.AUTH,
      operacion: AuditOperacion.PASSWORD,
      registroId: user.id,
      datosNuevos: { usuario: user.usuario, motivo: 'Restablecimiento forzado' },
      usuario: user.usuario,
      ip,
    });

    return this.generateAuthResponse(user);
  }

  /**
   * Cambio de contraseña de un usuario autenticado. Requiere la contraseña
   * actual.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado.');
    }

    const passwordMatch = await compare(dto.currentPassword, user.password);
    if (!passwordMatch) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    const samePassword = await compare(dto.newPassword, user.password);
    if (samePassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual.',
      );
    }

    const passwordHash = await hash(dto.newPassword, 12);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        cambiarPassword: false,
        fechaCaducidad: null,
      },
    });

    await this.auditoria.registrar({
      tabla: AuditTabla.AUTH,
      operacion: AuditOperacion.PASSWORD,
      registroId: user.id,
      datosNuevos: { usuario: user.usuario },
      usuario: user.usuario,
      ip,
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }

  /** Datos del perfil del usuario autenticado. */
  async profile(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado.');
    }

    return this.toPublicUser(user);
  }

  /** Actualiza los datos del perfil del usuario autenticado. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        nombre: dto.nombre,
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
    });

    return this.toPublicUser(user);
  }

  private async generateAuthResponse(user: PublicUserSource) {
    const payload: JwtPayload = {
      sub: user.id,
      usuario: user.usuario,
      rol: user.rol,
      type: 'access',
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: envs.JWT_EXPIRATION as any,
    });

    return {
      access_token,
      user: await this.toPublicUser(user),
    };
  }

  private signResetToken(userId: string): string {
    const payload: JwtPayload = { sub: userId, type: 'reset' };
    return this.jwtService.sign(payload, {
      expiresIn: envs.JWT_RESET_EXPIRATION as any,
    });
  }

  private async toPublicUser(user: PublicUserSource): Promise<AuthUser> {
    const access = await this.seguridad.getAccessForUser(user.id, user.rol);

    return {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      perfil: access.perfil,
      menu: access.menu,
      rutasPermitidas: access.rutasPermitidas,
      codigosPermitidos: access.codigosPermitidos,
      cambiarPassword: user.cambiarPassword,
    };
  }
}

interface PublicUserSource {
  id: string;
  usuario: string;
  nombre: string;
  email: string;
  rol: AuthUser['rol'];
  cambiarPassword: boolean;
}
