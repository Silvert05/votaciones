import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthUser } from '../auth/entities/auth.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateElectorDto,
  QueryElectoresDto,
  SetElectorActivoDto,
  UpdateElectorDto,
} from './dto/elector.dto';
import {
  AsignarElectoresDto,
  QueryPadronDto,
  UpdatePadronElectorDto,
} from './dto/padron.dto';
import { PadronesService } from './padrones.service';

@ApiTags('Padrones')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Controller('padrones')
export class PadronesController {
  constructor(private readonly padronesService: PadronesService) {}

  @Get('catalogos')
  @RequirePermission('elecciones.electores')
  @ApiOperation({ summary: 'Listar carreras y niveles institucionales' })
  catalogos() {
    return this.padronesService.catalogos();
  }

  @Get('electores')
  @RequirePermission('elecciones.electores')
  @ApiOperation({ summary: 'Listar electores institucionales' })
  listElectores(@Query() query: QueryElectoresDto) {
    return this.padronesService.listElectores(query);
  }

  @Post('electores')
  @RequirePermission('elecciones.electores')
  @ApiOperation({ summary: 'Crear elector institucional' })
  createElector(
    @Body() dto: CreateElectorDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.createElector(dto, { user, ip });
  }

  @Patch('electores/:id')
  @RequirePermission('elecciones.electores')
  @ApiOperation({ summary: 'Actualizar elector institucional' })
  updateElector(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateElectorDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.updateElector(id, dto, { user, ip });
  }

  @Post('electores/:id/foto')
  @RequirePermission('elecciones.electores')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['foto'],
      properties: { foto: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Cargar o reemplazar la foto de un elector' })
  uploadFotoElector(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    foto: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    if (!foto) {
      throw new BadRequestException('Debe seleccionar una imagen.');
    }
    return this.padronesService.updateFotoElector(id, foto, { user, ip });
  }

  @Delete('electores/:id/foto')
  @RequirePermission('elecciones.electores')
  @ApiOperation({ summary: 'Eliminar la foto de un elector' })
  deleteFotoElector(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.deleteFotoElector(id, { user, ip });
  }

  @Patch('electores/:id/estado')
  @RequirePermission('elecciones.electores')
  @ApiOperation({ summary: 'Activar o desactivar elector institucional' })
  setElectorActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetElectorActivoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.updateElector(
      id,
      { activo: dto.activo },
      { user, ip },
    );
  }

  @Get('elecciones/:eleccionId')
  // La pantalla de Candidaturas también lo usa para ver electores habilitados.
  @RequirePermission('elecciones.padron', 'elecciones.candidaturas')
  @ApiOperation({ summary: 'Listar padron electoral de una eleccion' })
  listPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: QueryPadronDto,
  ) {
    return this.padronesService.listPadron(eleccionId, query);
  }

  @Post('elecciones/:eleccionId/asignar')
  @RequirePermission('elecciones.padron')
  @ApiOperation({ summary: 'Asignar electores al padron de una eleccion' })
  asignarElectores(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() dto: AsignarElectoresDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.asignarElectores(eleccionId, dto, { user, ip });
  }

  @Post('elecciones/:eleccionId/auto-generar')
  @RequirePermission('elecciones.padron')
  @ApiOperation({ summary: 'Generar padron con electores activos elegibles' })
  autoGenerarPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.autoGenerarPadron(eleccionId, { user, ip });
  }

  @Patch('elecciones/:eleccionId/items/:padronId')
  @RequirePermission('elecciones.padron')
  @ApiOperation({ summary: 'Actualizar estado de un elector en el padron' })
  updatePadronElector(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('padronId', ParseUUIDPipe) padronId: string,
    @Body() dto: UpdatePadronElectorDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.updatePadronElector(eleccionId, padronId, dto, {
      user,
      ip,
    });
  }

  @Post('elecciones/:eleccionId/publicar')
  @RequirePermission('elecciones.padron')
  @ApiOperation({ summary: 'Publicar padron y cambiar estado de eleccion' })
  publicarPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.publicarPadron(eleccionId, { user, ip });
  }

  @Get('elecciones/:eleccionId/credenciales')
  @RequirePermission('elecciones.padron')
  @ApiOperation({
    summary: 'Listar el estado de entrega de credenciales de votacion',
  })
  listCredenciales(@Param('eleccionId', ParseUUIDPipe) eleccionId: string) {
    return this.padronesService.listCredenciales(eleccionId);
  }

  @Post('elecciones/:eleccionId/items/:padronId/credencial')
  @RequirePermission('elecciones.padron')
  @ApiOperation({ summary: 'Regenerar y enviar la credencial de un elector' })
  regenerarCredencial(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('padronId', ParseUUIDPipe) padronId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.regenerarCredencial(eleccionId, padronId, {
      user,
      ip,
    });
  }

  @Post('elecciones/:eleccionId/credenciales/reenviar-pendientes')
  // La pantalla de Jornada dispara este reenvío como parte de sus pasos.
  @RequirePermission('elecciones.padron', 'elecciones.jornada')
  @ApiOperation({ summary: 'Regenerar y reenviar credenciales no entregadas' })
  reenviarCredencialesPendientes(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.reenviarCredencialesPendientes(eleccionId, {
      user,
      ip,
    });
  }
}
