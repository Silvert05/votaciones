import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envs } from 'src/config';

export interface VotoPayload {
  sub: string; // electorId
  eleccionId: string;
  identificacion: string;
  type: 'voto';
}

@Injectable()
export class VotoGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de votacion.');
    }
    const token = header.slice(7);
    try {
      const payload = this.jwtService.verify<VotoPayload>(token, {
        secret: envs.JWT_SECRET,
      });
      if (payload.type !== 'voto') {
        throw new UnauthorizedException('Token de votacion invalido.');
      }
      request.votante = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de votacion invalido o expirado.');
    }
  }
}
