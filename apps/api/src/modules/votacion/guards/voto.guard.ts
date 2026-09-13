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

    // Solo la verificacion criptografica del token cae en este catch: un
    // token invalido/expirado/malformado siempre reporta el mismo motivo
    // generico (no debe filtrar detalle sobre su contenido).
    let payload: VotoPayload;
    try {
      payload = this.jwtService.verify<VotoPayload>(token, {
        secret: envs.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token de votacion invalido o expirado.');
    }

    if (payload.type !== 'voto') {
      throw new UnauthorizedException('Token de votacion invalido.');
    }

    // A partir de aqui son validaciones de negocio: cada una debe llegar al
    // votante con su propio motivo (no envolverlas en el catch de arriba,
    // que las aplanaria todas al mensaje generico de "token invalido").
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

    if (!padron || !padron.elector.activo || !padron.credencialHash) {
      throw new UnauthorizedException(
        'La sesion de votacion ya no esta habilitada.',
      );
    }
    if (padron.credencialVersion !== payload.credencialVersion || padron.credencialRevocadaAt) {
      throw new UnauthorizedException(
        'Tu credencial fue renovada o revocada. Solicita el acceso mas reciente.',
      );
    }
    if (padron.elector.votosEmitidos.length > 0) {
      throw new UnauthorizedException('Ya registraste tu voto en esta eleccion.');
    }
    if (!padron.publicado || padron.estado !== EstadoPadronElector.HABILITADO) {
      throw new UnauthorizedException(
        'Ya no figuras como habilitado en el padron de esta eleccion.',
      );
    }
    if (padron.eleccion.estado !== EstadoEleccion.VOTACION_ABIERTA) {
      throw new UnauthorizedException('La votacion no esta abierta en este momento.');
    }
    if (!padron.eleccion.jornada?.linkVotacionActivo) {
      throw new UnauthorizedException(
        'El acceso a la votacion fue desactivado temporalmente. Intenta nuevamente en unos minutos.',
      );
    }

    request.votante = payload;
    return true;
  }
}
