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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/entities/auth.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpsertConfiguracionEleccionDto } from './dto/configuracion.dto';
import { UpsertCronogramaDto } from './dto/cronograma.dto';
import {
  CambiarEstadoEleccionDto,
  CreateEleccionDto,
  QueryEleccionesDto,
  UpdateEleccionDto,
} from './dto/eleccion.dto';
import {
  CreateDignidadDto,
  UpdateDignidadDto,
} from './dto/dignidad.dto';
import { EleccionesService } from './elecciones.service';

/**
 * Listar/obtener una elección es la base que usan todas las pantallas del
 * módulo Elecciones para poblar el selector de "proceso electoral" — no solo
 * la pantalla de Gestión. Se permite el acceso con cualquiera de estos
 * codigos, no solo con 'elecciones.gestion'.
 */
const CODIGOS_ELECCION_BASE = [
  'elecciones.gestion',
  'elecciones.configuracion',
  'elecciones.cronograma',
  'elecciones.dignidades',
  'elecciones.padron',
  'elecciones.listas',
  'elecciones.candidaturas',
  'elecciones.jornada',
];

@ApiTags('Elecciones')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Controller('elecciones')
export class EleccionesController {
  constructor(private readonly eleccionesService: EleccionesService) {}

  @Get()
  @RequirePermission(...CODIGOS_ELECCION_BASE)
  @ApiOperation({ summary: 'Listar elecciones institucionales' })
  findAll(@Query() query: QueryEleccionesDto) {
    return this.eleccionesService.findAll(query);
  }

  @Get('resumen/dashboard')
  @RequirePermission(...CODIGOS_ELECCION_BASE)
  @ApiOperation({ summary: 'Resumen operativo del panel administrativo' })
  dashboard() {
    return this.eleccionesService.dashboard();
  }

  @Get(':id')
  @RequirePermission(...CODIGOS_ELECCION_BASE)
  @ApiOperation({ summary: 'Obtener una eleccion con cronograma y dignidades' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eleccionesService.findOne(id);
  }

  @Post()
  @RequirePermission('elecciones.gestion')
  @ApiOperation({ summary: 'Crear eleccion en estado borrador' })
  create(
    @Body() dto: CreateEleccionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.create(dto, { user, ip });
  }

  @Patch(':id')
  @RequirePermission('elecciones.gestion')
  @ApiOperation({ summary: 'Actualizar datos generales de una eleccion' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEleccionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.update(id, dto, { user, ip });
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de la eleccion con historial' })
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoEleccionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.cambiarEstado(id, dto, { user, ip });
  }

  @Get(':id/configuracion')
  @RequirePermission('elecciones.configuracion')
  @ApiOperation({ summary: 'Obtener configuracion institucional de la eleccion' })
  getConfiguracion(@Param('id', ParseUUIDPipe) id: string) {
    return this.eleccionesService.getConfiguracion(id);
  }

  @Patch(':id/configuracion')
  @RequirePermission('elecciones.configuracion')
  @ApiOperation({ summary: 'Crear o actualizar configuracion institucional' })
  upsertConfiguracion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertConfiguracionEleccionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.upsertConfiguracion(id, dto, { user, ip });
  }

  @Patch(':id/cronograma')
  @RequirePermission('elecciones.cronograma')
  @ApiOperation({ summary: 'Crear o actualizar cronograma electoral' })
  upsertCronograma(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCronogramaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.upsertCronograma(id, dto, { user, ip });
  }

  @Post(':id/dignidades')
  @RequirePermission('elecciones.dignidades')
  @ApiOperation({ summary: 'Crear dignidad o cargo a elegir' })
  createDignidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDignidadDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.createDignidad(id, dto, { user, ip });
  }

  @Patch(':id/dignidades/:dignidadId')
  @RequirePermission('elecciones.dignidades')
  @ApiOperation({ summary: 'Actualizar dignidad o cargo a elegir' })
  updateDignidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dignidadId', ParseUUIDPipe) dignidadId: string,
    @Body() dto: UpdateDignidadDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.updateDignidad(id, dignidadId, dto, {
      user,
      ip,
    });
  }

  @Patch(':id/dignidades/:dignidadId/desactivar')
  @RequirePermission('elecciones.dignidades')
  @ApiOperation({ summary: 'Desactivar dignidad o cargo a elegir' })
  deleteDignidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('dignidadId', ParseUUIDPipe) dignidadId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.deleteDignidad(id, dignidadId, { user, ip });
  }
}
