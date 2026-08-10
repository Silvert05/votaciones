import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from 'prisma/generated/enums';
import { SeguridadService } from '../../seguridad/seguridad.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthUser } from '../entities/auth.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly seguridad: SeguridadService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const codigos = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!codigos || codigos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado.');
    }

    if (user.rol === Rol.ADMIN) {
      return true;
    }

    const access = await this.seguridad.getAccessForUser(user.id, user.rol);
    const tieneAcceso = codigos.some((codigo) =>
      access.codigosPermitidos.includes(codigo),
    );
    if (!tieneAcceso) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }

    return true;
  }
}
