import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { envs } from 'src/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtResetStrategy } from './strategies/jwt-reset.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: envs.JWT_SECRET,
      signOptions: { expiresIn: envs.JWT_EXPIRATION as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtResetStrategy],
  exports: [AuthService],
})
export class AuthModule {}
