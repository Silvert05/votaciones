import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Igual que ThrottlerGuard pero, cuando el body trae `identificacion` o
 * `email` (endpoints de login), agrupa el contador por cuenta ademas de IP.
 * Evita que muchos votantes detras de la misma red/NAT institucional se
 * bloqueen entre si al iniciar sesion, sin perder la proteccion contra
 * fuerza bruta sobre una misma credencial.
 */
@Injectable()
export class AccountAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const cuenta =
      req.body?.identificacion ?? req.body?.username ?? req.body?.email;
    return cuenta ? `${req.ip}:${cuenta}` : req.ip;
  }
}
