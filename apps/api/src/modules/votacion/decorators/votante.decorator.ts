import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { VotoPayload } from '../guards/voto.guard';

export const Votante = createParamDecorator(
  (data: keyof VotoPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const votante: VotoPayload | undefined = request.votante;
    return data ? votante?.[data] : votante;
  },
);
