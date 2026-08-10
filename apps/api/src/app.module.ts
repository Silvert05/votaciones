import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountAwareThrottlerGuard } from './config';
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
import { ReportesModule } from './modules/reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,
      },
    ]),
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
    ReportesModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccountAwareThrottlerGuard,
    },
  ],
})
export class AppModule {}
