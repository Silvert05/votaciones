import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { CandidaturasController } from './candidaturas.controller';
import { CandidaturasService } from './candidaturas.service';

@Module({
  imports: [AuditoriaModule, SeguridadModule],
  controllers: [CandidaturasController],
  providers: [CandidaturasService],
})
export class CandidaturasModule {}