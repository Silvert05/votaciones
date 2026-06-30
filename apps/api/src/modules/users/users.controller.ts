import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from 'prisma/generated/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/entities/auth.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateUserDto,
  QueryUsersDto,
  ResetUserPasswordDto,
  ToggleActivoDto,
  UpdateUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (paginado)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario (contraseña temporal)' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.usersService.create(dto, { user, ip });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos del usuario (nombre, email, rol)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.usersService.update(id, dto, { user, ip });
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar / desactivar usuario' })
  setActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleActivoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.usersService.setActivo(id, dto.activo, { user, ip });
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Resetear contraseña (temporal + cambio forzado)' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.usersService.resetPassword(id, dto.password, { user, ip });
  }
}
