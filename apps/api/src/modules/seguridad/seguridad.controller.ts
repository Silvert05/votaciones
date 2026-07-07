import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  CreateOpcionDto,
  ToggleOpcionActivoDto,
  UpdateOpcionDto,
} from './dto/opcion.dto';
import {
  CreatePerfilDto,
  SetPerfilOpcionesDto,
  TogglePerfilActivoDto,
  UpdatePerfilDto,
} from './dto/perfil.dto';
import { SeguridadService } from './seguridad.service';

@ApiTags('Seguridad')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('seguridad')
export class SeguridadController {
  constructor(private readonly seguridadService: SeguridadService) {}

  @Get('mi-menu')
  @ApiOperation({ summary: 'Menu y rutas permitidas del usuario autenticado' })
  miMenu(@CurrentUser() user: AuthUser) {
    return this.seguridadService.getAccessForUser(user.id, user.rol);
  }

  @Get('opciones')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Listar opciones / pantallas del sistema' })
  listOpciones() {
    return this.seguridadService.listOpciones();
  }

  @Post('opciones')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear opcion / pantalla del sistema' })
  createOpcion(
    @Body() dto: CreateOpcionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.createOpcion(dto, { user, ip });
  }

  @Patch('opciones/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar opcion / pantalla del sistema' })
  updateOpcion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpcionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.updateOpcion(id, dto, { user, ip });
  }

  @Patch('opciones/:id/estado')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Activar / desactivar opcion' })
  setOpcionActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleOpcionActivoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.setOpcionActivo(id, dto.activo, { user, ip });
  }

  @Get('perfiles')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Listar perfiles de acceso' })
  listPerfiles() {
    return this.seguridadService.listPerfiles();
  }

  @Get('perfiles/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Obtener perfil con opciones asignadas' })
  getPerfil(@Param('id', ParseUUIDPipe) id: string) {
    return this.seguridadService.getPerfil(id);
  }

  @Post('perfiles')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Crear perfil de acceso' })
  createPerfil(
    @Body() dto: CreatePerfilDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.createPerfil(dto, { user, ip });
  }

  @Patch('perfiles/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Actualizar perfil de acceso' })
  updatePerfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePerfilDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.updatePerfil(id, dto, { user, ip });
  }

  @Patch('perfiles/:id/estado')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Activar / desactivar perfil' })
  setPerfilActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TogglePerfilActivoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.setPerfilActivo(id, dto.activo, { user, ip });
  }

  @Patch('perfiles/:id/opciones')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Asignar opciones a un perfil' })
  setPerfilOpciones(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPerfilOpcionesDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.seguridadService.setPerfilOpciones(id, dto.opcionIds, {
      user,
      ip,
    });
  }
}
