import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, SeguridadModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
