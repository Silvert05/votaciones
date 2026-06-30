import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from 'src/config';
import { PrismaService } from 'src/prisma';
import { AuthUser, JwtPayload } from '../entities/auth.entity';

@Injectable()
export class JwtResetStrategy extends PassportStrategy(Strategy, 'jwt-reset') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envs.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type !== 'reset') {
      throw new UnauthorizedException('Token de restablecimiento inválido.');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no autorizado.');
    }

    return {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      cambiarPassword: user.cambiarPassword,
    };
  }
}
