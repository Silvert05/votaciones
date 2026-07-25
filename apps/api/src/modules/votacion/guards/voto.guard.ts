import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EstadoEleccion, EstadoPadronElector } from 'prisma/generated/enums';
import { envs } from 'src/config';
import { PrismaService } from 'src/prisma';

export interface VotoPayload {
  sub: string; // electorId
  eleccionId: string;
  identificacion: string;
  credencialVersion: number;
  type: 'voto';
}

@Injectable()
export class VotoGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
      const padron = await this.prisma.padronElectoral.findUnique({
        where: {
          eleccionId_electorId: {
            eleccionId: payload.eleccionId,
            electorId: payload.sub,
          },
        },
        select: {
          publicado: true,
          estado: true,
          credencialHash: true,
          credencialRevocadaAt: true,
          credencialVersion: true,
          eleccion: {
            select: {
              estado: true,
              jornada: { select: { linkVotacionActivo: true } },
            },
          },
          elector: {
            select: {
              activo: true,
              votosEmitidos: {
                where: { eleccionId: payload.eleccionId },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      });
      if (
        !padron ||
        !padron.publicado ||
        padron.estado !== EstadoPadronElector.HABILITADO ||
        !padron.elector.activo ||
        !padron.credencialHash ||
        padron.credencialRevocadaAt ||
        padron.credencialVersion !== payload.credencialVersion ||
        padron.elector.votosEmitidos.length > 0 ||
        padron.eleccion.estado !== EstadoEleccion.VOTACION_ABIERTA ||
        !padron.eleccion.jornada?.linkVotacionActivo
      ) {
        throw new UnauthorizedException(
          'La sesion de votacion ya no esta habilitada.',
        );
      }
      request.votante = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de votacion invalido o expirado.');
    }
  }
}
