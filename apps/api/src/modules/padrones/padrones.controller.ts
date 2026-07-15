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
import { Rol } from 'prisma/generated/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/entities/auth.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('padrones')
export class PadronesController {
  constructor(private readonly padronesService: PadronesService) {}

  @Get('catalogos')
  @ApiOperation({ summary: 'Listar carreras y niveles institucionales' })
  catalogos() {
    return this.padronesService.catalogos();
  }

  @Get('electores')
  @ApiOperation({ summary: 'Listar electores institucionales' })
  listElectores(@Query() query: QueryElectoresDto) {
    return this.padronesService.listElectores(query);
  }

  @Post('electores')
  @ApiOperation({ summary: 'Crear elector institucional' })
  createElector(
    @Body() dto: CreateElectorDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.createElector(dto, { user, ip });
  }

  @Patch('electores/:id')
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
  @ApiOperation({ summary: 'Eliminar la foto de un elector' })
  deleteFotoElector(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.deleteFotoElector(id, { user, ip });
  }

  @Patch('electores/:id/estado')
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
  @ApiOperation({ summary: 'Listar padron electoral de una eleccion' })
  listPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: QueryPadronDto,
  ) {
    return this.padronesService.listPadron(eleccionId, query);
  }

  @Post('elecciones/:eleccionId/asignar')
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
  @ApiOperation({ summary: 'Generar padron con electores activos elegibles' })
  autoGenerarPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.autoGenerarPadron(eleccionId, { user, ip });
  }

  @Patch('elecciones/:eleccionId/items/:padronId')
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
  @ApiOperation({ summary: 'Publicar padron y cambiar estado de eleccion' })
  publicarPadron(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.padronesService.publicarPadron(eleccionId, { user, ip });
  }

  @Get('elecciones/:eleccionId/credenciales')
  @ApiOperation({
    summary: 'Listar credenciales de votacion generadas (DNI + clave)',
  })
  listCredenciales(@Param('eleccionId', ParseUUIDPipe) eleccionId: string) {
    return this.padronesService.listCredenciales(eleccionId);
  }

  @Post('elecciones/:eleccionId/items/:padronId/credencial')
  @ApiOperation({ summary: 'Regenerar la credencial de un elector' })
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
}
