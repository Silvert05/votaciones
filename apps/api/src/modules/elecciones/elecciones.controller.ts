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

@ApiTags('Elecciones')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('elecciones')
export class EleccionesController {
  constructor(private readonly eleccionesService: EleccionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar elecciones institucionales' })
  findAll(@Query() query: QueryEleccionesDto) {
    return this.eleccionesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una eleccion con cronograma y dignidades' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eleccionesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear eleccion en estado borrador' })
  create(
    @Body() dto: CreateEleccionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.eleccionesService.create(dto, { user, ip });
  }

  @Patch(':id')
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
  @ApiOperation({ summary: 'Obtener configuracion institucional de la eleccion' })
  getConfiguracion(@Param('id', ParseUUIDPipe) id: string) {
    return this.eleccionesService.getConfiguracion(id);
  }

  @Patch(':id/configuracion')
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
