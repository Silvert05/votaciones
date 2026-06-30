import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from 'prisma/generated/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message ?? message;
        error = (res as any).error ?? error;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Errores conocidos de Prisma → mensajes legibles para el cliente
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Constraint Error';
      switch (exception.code) {
        case 'P2002':
          message = `Ya existe un registro con ese valor único: ${(exception.meta?.target as string[])?.join(', ') ?? ''
            }`;
          break;
        case 'P2003':
          message = 'Violación de llave foránea: el registro relacionado no existe.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro no encontrado.';
          break;
        default:
          message = `Error de base de datos (${exception.code}).`;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      status = HttpStatus.BAD_REQUEST;
      error = 'Business Rule Violation';
    }

    this.logger.error(
      `${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`,
    );

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
