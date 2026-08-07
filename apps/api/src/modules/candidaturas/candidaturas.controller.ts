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
  CalificarCandidaturaDto,
  CreateCandidaturaDto,
  QueryCandidaturasDto,
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('candidaturas')
export class CandidaturasController {
  constructor(private readonly candidaturasService: CandidaturasService) {}

  @Post('elecciones/:eleccionId/abrir')
  @ApiOperation({ summary: 'Abrir inscripcion de candidaturas' })
  abrirCandidaturas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.abrirCandidaturas(eleccionId, { user, ip });
  }

  @Post('elecciones/:eleccionId/cerrar-calificacion')
  @ApiOperation({ summary: 'Cerrar calificacion de candidaturas' })
  cerrarCalificacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.candidaturasService.cerrarCalificacion(eleccionId, { user, ip });
  }

  @Get('elecciones/:eleccionId/listas')
  @ApiOperation({ summary: 'Listar listas electorales' })
  listListas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: QueryListasDto,
  ) {
    return this.candidaturasService.listListas(eleccionId, query);
  }

  @Post('elecciones/:eleccionId/listas')
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
  @ApiOperation({ summary: 'Listar candidaturas' })
  listCandidaturas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: QueryCandidaturasDto,
  ) {
    return this.candidaturasService.listCandidaturas(eleccionId, query);
  }

  @Post('elecciones/:eleccionId')
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
}