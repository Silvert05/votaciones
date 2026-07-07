import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CandidaturasController } from './candidaturas.controller';
import { CandidaturasService } from './candidaturas.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [CandidaturasController],
  providers: [CandidaturasService],
})
export class CandidaturasModule {}