import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CorreoModule } from '../correo/correo.module';
import { PadronesController } from './padrones.controller';
import { PadronesService } from './padrones.service';

@Module({
  imports: [AuditoriaModule, CorreoModule],
  controllers: [PadronesController],
  providers: [PadronesService],
})
export class PadronesModule {}
