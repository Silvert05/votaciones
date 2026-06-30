import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { PrismaService } from 'src/prisma';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';

export interface RegistrarAuditoria {
  tabla: string;
  operacion: string;
  registroId?: string | null;
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
  usuario?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento de auditoría. Nunca lanza: un fallo de auditoría no debe
   * interrumpir la operación de negocio.
   */
  async registrar(params: RegistrarAuditoria): Promise<void> {
    try {
      await this.prisma.auditoria.create({
        data: {
          tabla: params.tabla,
          operacion: params.operacion,
          registroId: params.registroId ?? null,
          datosAnteriores: this.toJson(params.datosAnteriores),
          datosNuevos: this.toJson(params.datosNuevos),
          usuario: params.usuario ?? null,
          ip: this.normalizeIp(params.ip),
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría (${params.tabla}/${params.operacion}): ${
          (error as Error).message
        }`,
      );
    }
  }

  /** Lista paginada de eventos de auditoría con filtros. */
  async findAll(query: QueryAuditoriaDto) {
    const { page, limit, tabla, operacion, usuario, desde, hasta } = query;

    const where: Prisma.AuditoriaWhereInput = {};
    if (tabla) where.tabla = tabla;
    if (operacion) where.operacion = operacion;
    if (usuario) {
      where.usuario = { contains: usuario, mode: 'insensitive' };
    }
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde);
      if (hasta) where.createdAt.lte = new Date(hasta);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value as Prisma.InputJsonValue;
  }

  private normalizeIp(ip?: string | null): string | null {
    if (!ip) return null;
    // Express suele entregar IPv4 mapeada en IPv6 (::ffff:127.0.0.1).
    return ip.replace(/^::ffff:/, '');
  }
}
