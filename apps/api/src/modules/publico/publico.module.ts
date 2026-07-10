import { Module } from '@nestjs/common';
import { VotacionModule } from '../votacion/votacion.module';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [VotacionModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
