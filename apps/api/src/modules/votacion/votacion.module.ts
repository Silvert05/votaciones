import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { VotacionController } from './votacion.controller';
import { VotacionService } from './votacion.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [VotacionController],
  providers: [VotacionService],
})
export class VotacionModule {}
