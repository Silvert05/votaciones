import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma';
import { AuthModule } from './modules/auth/auth.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { EleccionesModule } from './modules/elecciones/elecciones.module';
import { CandidaturasModule } from './modules/candidaturas/candidaturas.module';
import { PadronesModule } from './modules/padrones/padrones.module';
import { SeguridadModule } from './modules/seguridad/seguridad.module';
import { UsersModule } from './modules/users/users.module';
import { VotacionModule } from './modules/votacion/votacion.module';
import { JornadaModule } from './modules/jornada/jornada.module';
import { PublicoModule } from './modules/publico/publico.module';
import { EscrutinioModule } from './modules/escrutinio/escrutinio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuditoriaModule,
    SeguridadModule,
    EleccionesModule,
    CandidaturasModule,
    PadronesModule,
    VotacionModule,
    JornadaModule,
    PublicoModule,
    EscrutinioModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
