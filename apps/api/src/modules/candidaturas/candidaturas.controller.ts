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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthUser } from '../auth/entities/auth.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CalificarCandidaturaDto,
  CreateCandidaturaDto,
  ImpugnarCalificacionDto,
  QueryCandidaturasDto,
  ResolverImpugnacionCandidaturaDto,
  SubsanarCandidaturaDto,
  UpdateCandidaturaDto,
} from './dto/candidatura.dto';
import {
  CreateListaDto,
  QueryListasDto,
  SetDignidadListaEstadoDto,
  UpdateListaDto,
} from './dto/lista.dto';
import { CandidaturasService } from './candidaturas.service';

@ApiTags('Candidaturas')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Controller('candidaturas')
export class CandidaturasController {
  constructor(private readonly candidaturasService: CandidaturasService) {}

  @Post('elecciones/:eleccionId/abrir')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({ summary: 'Abrir inscripcion de candidaturas' })
  abrirCandidaturas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.abrirCandidaturas(eleccionId, { user, ip });
  }

  @Post('elecciones/:eleccionId/cerrar-calificacion')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({ summary: 'Cerrar calificacion de candidaturas' })
  cerrarCalificacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.cerrarCalificacion(eleccionId, { user, ip });
  }

  @Get('elecciones/:eleccionId/listas')
  @RequirePermission('elecciones.listas')
  @ApiOperation({ summary: 'Listar listas electorales' })
  listListas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: QueryListasDto,
  ) {
    return this.candidaturasService.listListas(eleccionId, query);
  }

  @Post('elecciones/:eleccionId/listas')
  @RequirePermission('elecciones.listas')
  @ApiOperation({ summary: 'Crear lista electoral' })
  createLista(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() dto: CreateListaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.createLista(eleccionId, dto, { user, ip });
  }

  @Patch('elecciones/:eleccionId/listas/:listaId')
  @RequirePermission('elecciones.listas')
  @ApiOperation({ summary: 'Actualizar lista electoral' })
  updateLista(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('listaId', ParseUUIDPipe) listaId: string,
    @Body() dto: UpdateListaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.updateLista(eleccionId, listaId, dto, {
      user,
      ip,
    });
  }

  @Get('elecciones/:eleccionId/listas/:listaId/dignidades')
  @RequirePermission('elecciones.listas')
  @ApiOperation({ summary: 'Listar dignidades habilitadas para una lista' })
  listDignidadesPorLista(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('listaId', ParseUUIDPipe) listaId: string,
  ) {
    return this.candidaturasService.listDignidadesPorLista(
      eleccionId,
      listaId,
    );
  }

  @Patch('elecciones/:eleccionId/listas/:listaId/dignidades/:dignidadId')
  @RequirePermission('elecciones.listas')
  @ApiOperation({
    summary: 'Habilitar o inhabilitar una dignidad para una lista',
  })
  setDignidadHabilitadaEnLista(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('listaId', ParseUUIDPipe) listaId: string,
    @Param('dignidadId', ParseUUIDPipe) dignidadId: string,
    @Body() dto: SetDignidadListaEstadoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.setDignidadHabilitadaEnLista(
      eleccionId,
      listaId,
      dignidadId,
      dto,
      { user, ip },
    );
  }

  @Get('elecciones/:eleccionId')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({ summary: 'Listar candidaturas' })
  listCandidaturas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: QueryCandidaturasDto,
  ) {
    return this.candidaturasService.listCandidaturas(eleccionId, query);
  }

  @Post('elecciones/:eleccionId')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({ summary: 'Registrar candidatura' })
  createCandidatura(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() dto: CreateCandidaturaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.createCandidatura(eleccionId, dto, {
      user,
      ip,
    });
  }

  @Patch('elecciones/:eleccionId/:candidaturaId')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({ summary: 'Actualizar candidatura' })
  updateCandidatura(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('candidaturaId', ParseUUIDPipe) candidaturaId: string,
    @Body() dto: UpdateCandidaturaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.updateCandidatura(
      eleccionId,
      candidaturaId,
      dto,
      { user, ip },
    );
  }

  @Patch('elecciones/:eleccionId/:candidaturaId/calificacion')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({ summary: 'Calificar, rechazar o retirar candidatura' })
  calificarCandidatura(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('candidaturaId', ParseUUIDPipe) candidaturaId: string,
    @Body() dto: CalificarCandidaturaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.calificarCandidatura(
      eleccionId,
      candidaturaId,
      dto,
      { user, ip },
    );
  }

  @Patch('elecciones/:eleccionId/:candidaturaId/subsanar')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({
    summary: 'Subsanar documentacion de una candidatura observada (Art. 13)',
  })
  subsanarCandidatura(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('candidaturaId', ParseUUIDPipe) candidaturaId: string,
    @Body() dto: SubsanarCandidaturaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.subsanarCandidatura(
      eleccionId,
      candidaturaId,
      dto,
      { user, ip },
    );
  }

  @Post('elecciones/:eleccionId/:candidaturaId/impugnar-calificacion')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({
    summary: 'Impugnar la calificacion de una candidatura rechazada (Art. 14)',
  })
  impugnarCalificacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Param('candidaturaId', ParseUUIDPipe) candidaturaId: string,
    @Body() dto: ImpugnarCalificacionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.impugnarCalificacion(
      eleccionId,
      candidaturaId,
      dto,
      { user, ip },
    );
  }

  @Patch('impugnaciones-calificacion/:impugnacionId/resolver')
  @RequirePermission('elecciones.candidaturas')
  @ApiOperation({
    summary: 'Resolver impugnacion a la calificacion (resolucion de ultima instancia)',
  })
  resolverImpugnacionCalificacion(
    @Param('impugnacionId', ParseUUIDPipe) impugnacionId: string,
    @Body() dto: ResolverImpugnacionCandidaturaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.resolverImpugnacionCalificacion(
      impugnacionId,
      dto,
      { user, ip },
    );
  }
}