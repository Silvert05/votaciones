import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Rol } from 'prisma/generated/enums';
import { EstadoEleccion } from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import { AuthUser } from '../auth/entities/auth.entity';
import { JornadaService } from './jornada.service';

const SYSTEM_ACTOR: { user: AuthUser; ip: string | null } = {
  user: {
    id: '00000000-0000-0000-0000-000000000000',
    usuario: 'sistema',
    nombre: 'Sistema (automatico)',
    email: 'sistema@local',
    rol: Rol.ADMIN,
    cambiarPassword: false,
  },
  ip: null,
};

/**
 * Cierra la votacion y publica resultados automaticamente cuando se cumplen
 * las fechas configuradas en el cronograma, sin esperar una llamada manual
 * del administrador. El cierre/publicacion manual anticipado (antes de esa
 * fecha) sigue existiendo vía el flag `forzar` en JornadaService.
 */
@Injectable()
export class JornadaScheduler {
  private readonly logger = new Logger(JornadaScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jornadaService: JornadaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async ejecutar(): Promise<void> {
    await this.iniciarVotacionesProgramadas();
    await this.cerrarVotacionesVencidas();
    await this.publicarResultadosVencidos();
  }

  private async iniciarVotacionesProgramadas(): Promise<void> {
    const now = new Date();
    const elecciones = await this.prisma.eleccion.findMany({
      where: {
        jornada: { puestaCeroAt: { not: null }, votacionIniciadaAt: null },
        cronograma: {
          fechaInicioVotacion: { lte: now },
          fechaFinVotacion: { gt: now },
        },
      },
      select: { id: true },
    });

    for (const eleccion of elecciones) {
      try {
        await this.jornadaService.iniciarVotacion(
          eleccion.id,
          { reporte: 'Votacion iniciada automaticamente por el cronograma.' },
          SYSTEM_ACTOR,
        );
      } catch (error) {
        // Es normal que falle mientras falten credenciales por enviar; el
        // cron lo reintenta cada minuto hasta que este todo listo o pase la
        // fecha de cierre.
        this.logger.warn(
          `No se pudo iniciar automaticamente la eleccion ${eleccion.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async cerrarVotacionesVencidas(): Promise<void> {
    const now = new Date();
    const elecciones = await this.prisma.eleccion.findMany({
      where: {
        estado: EstadoEleccion.VOTACION_ABIERTA,
        jornada: { votacionIniciadaAt: { not: null }, votacionCerradaAt: null },
        cronograma: { fechaFinVotacion: { lte: now } },
      },
      select: { id: true },
    });

    for (const eleccion of elecciones) {
      try {
        await this.jornadaService.cerrarVotacion(
          eleccion.id,
          { reporte: 'Votacion cerrada automaticamente por el cronograma.' },
          SYSTEM_ACTOR,
        );
      } catch (error) {
        this.logger.error(
          `No se pudo cerrar automaticamente la eleccion ${eleccion.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async publicarResultadosVencidos(): Promise<void> {
    const now = new Date();
    const elecciones = await this.prisma.eleccion.findMany({
      where: {
        estado: EstadoEleccion.VOTACION_CERRADA,
        jornada: { votacionCerradaAt: { not: null }, resultadosAt: null },
        cronograma: { fechaPublicacionResultados: { lte: now } },
      },
      select: { id: true },
    });

    for (const eleccion of elecciones) {
      try {
        await this.jornadaService.generarResultados(
          eleccion.id,
          { reporte: 'Resultados publicados automaticamente por el cronograma.' },
          SYSTEM_ACTOR,
        );
      } catch (error) {
        this.logger.error(
          `No se pudieron publicar automaticamente los resultados de la eleccion ${eleccion.id}: ${(error as Error).message}`,
        );
      }
    }
  }
}
