import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { JornadaController } from './jornada.controller';
import { JornadaScheduler } from './jornada.scheduler';
import { JornadaService } from './jornada.service';

@Module({
  imports: [AuditoriaModule, SeguridadModule],
  controllers: [JornadaController],
  providers: [JornadaService, JornadaScheduler],
})
export class JornadaModule {}
