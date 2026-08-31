import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EstadoEleccion } from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma';
import { CorreoService } from '../correo/correo.service';

const UMBRAL_DIAS = 15;

const CAMPOS_CRITICOS: Array<{
  campo: 'fechaFinVotacion' | 'fechaPublicacionResultados';
  label: string;
}> = [
  { campo: 'fechaFinVotacion', label: 'Cierre de la votacion' },
  { campo: 'fechaPublicacionResultados', label: 'Publicacion de resultados' },
];

/**
 * Avisa por correo al personal marcado como "encargado de cronograma"
 * cuando falta poco para el inicio de la votacion de una eleccion y su
 * cronograma sigue incompleto. Corre a diario y se repite mientras el
 * cronograma no se complete (no guarda un registro de "ya avisado").
 */
@Injectable()
export class CronogramaAlertaScheduler {
  private readonly logger = new Logger(CronogramaAlertaScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correoService: CorreoService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async ejecutar(): Promise<void> {
    const now = new Date();
    const limite = new Date(now);
    limite.setDate(limite.getDate() + UMBRAL_DIAS);

    const elecciones = await this.prisma.eleccion.findMany({
      where: {
        estado: { notIn: [EstadoEleccion.POSESIONADA, EstadoEleccion.ANULADA] },
        cronograma: {
          fechaInicioVotacion: { gte: now, lte: limite },
          OR: [
            { fechaFinVotacion: null },
            { fechaPublicacionResultados: null },
          ],
        },
      },
      select: {
        id: true,
        nombre: true,
        cronograma: {
          select: {
            fechaInicioVotacion: true,
            fechaFinVotacion: true,
            fechaPublicacionResultados: true,
          },
        },
      },
    });

    if (!elecciones.length) return;

    const encargados = await this.prisma.usuario.findMany({
      where: { encargadoCronograma: true, activo: true },
      select: { email: true, nombre: true },
    });

    if (!encargados.length) return;

    for (const eleccion of elecciones) {
      const camposFaltantes = CAMPOS_CRITICOS.filter(
        ({ campo }) => !eleccion.cronograma?.[campo],
      ).map(({ label }) => label);

      if (!camposFaltantes.length) continue;

      const diasRestantes = Math.max(
        0,
        Math.ceil(
          (eleccion.cronograma!.fechaInicioVotacion!.getTime() - now.getTime()) /
            86_400_000,
        ),
      );

      for (const encargado of encargados) {
        try {
          await this.correoService.enviarAlertaCronogramaIncompleto({
            email: encargado.email,
            nombre: encargado.nombre,
            eleccionNombre: eleccion.nombre,
            diasRestantes,
            camposFaltantes,
          });
        } catch (error) {
          this.logger.warn(
            `No se pudo enviar la alerta de cronograma de la eleccion ${eleccion.id} a ${encargado.email}: ${(error as Error).message}`,
          );
        }
      }
    }
  }
}
