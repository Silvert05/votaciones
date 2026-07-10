import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { envs } from 'src/config';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { VotoGuard } from './guards/voto.guard';
import { VotacionController } from './votacion.controller';
import { VotacionService } from './votacion.service';

@Module({
  imports: [
    AuditoriaModule,
    JwtModule.register({ secret: envs.JWT_SECRET }),
  ],
  controllers: [VotacionController],
  providers: [VotacionService, VotoGuard],
  exports: [VotacionService, VotoGuard, JwtModule],
})
export class VotacionModule {}
