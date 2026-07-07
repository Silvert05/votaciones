import { Module } from '@nestjs/common';
import { EleccionesController } from './elecciones.controller';
import { EleccionesService } from './elecciones.service';

@Module({
  controllers: [EleccionesController],
  providers: [EleccionesService],
})
export class EleccionesModule {}
