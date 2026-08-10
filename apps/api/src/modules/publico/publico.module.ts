import { Module } from '@nestjs/common';
import { ReportesModule } from '../reportes/reportes.module';
import { VotacionModule } from '../votacion/votacion.module';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [VotacionModule, ReportesModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
