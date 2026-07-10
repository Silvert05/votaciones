import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { JornadaController } from './jornada.controller';
import { JornadaService } from './jornada.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [JornadaController],
  providers: [JornadaService],
})
export class JornadaModule {}
