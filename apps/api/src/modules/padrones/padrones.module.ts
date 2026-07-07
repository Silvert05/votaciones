import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PadronesController } from './padrones.controller';
import { PadronesService } from './padrones.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [PadronesController],
  providers: [PadronesService],
})
export class PadronesModule {}