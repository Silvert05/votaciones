import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { EscrutinioController } from './escrutinio.controller';
import { EscrutinioService } from './escrutinio.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [EscrutinioController],
  providers: [EscrutinioService],
})
export class EscrutinioModule {}
