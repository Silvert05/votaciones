import { Module } from '@nestjs/common';
import { CorreoModule } from '../correo/correo.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { CronogramaAlertaScheduler } from './cronograma-alerta.scheduler';
import { EleccionesController } from './elecciones.controller';
import { EleccionesService } from './elecciones.service';

@Module({
  imports: [SeguridadModule, CorreoModule],
  controllers: [EleccionesController],
  providers: [EleccionesService, CronogramaAlertaScheduler],
})
export class EleccionesModule {}
