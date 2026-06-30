import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ChangePasswordDto,
  LoginDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import type { AuthUser } from './entities/auth.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtResetGuard } from './guards/jwt-reset.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtResetGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Restablecer contraseña (forzado en primer login)',
  })
  resetPassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ResetPasswordDto,
    @Ip() ip: string,
  ) {
    return this.authService.resetPassword(userId, dto, ip);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Cambiar contraseña (usuario autenticado)' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
  ) {
    return this.authService.changePassword(userId, dto, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  profile(@CurrentUser('id') userId: string) {
    return this.authService.profile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@CurrentUser() user: AuthUser, @Ip() ip: string) {
    // Con JWT stateless el cierre de sesión se realiza descartando el token en
    // el cliente. Se registra el evento para auditoría.
    return this.authService.auditLogout(user, ip);
  }
}
