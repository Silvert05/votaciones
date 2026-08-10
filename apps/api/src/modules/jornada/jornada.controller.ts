import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
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
import {
  IniciarVotacionDto,
  PasoJornadaDto,
  ReiniciarJornadaDto,
} from './dto/jornada.dto';
import { JornadaService } from './jornada.service';

@ApiTags('Jornada electoral')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('elecciones.jornada')
@Controller('jornada')
export class JornadaController {
  constructor(private readonly jornadaService: JornadaService) {}

  @Get('elecciones/:id')
  @ApiOperation({ summary: 'Estado de la jornada electoral (5 pasos)' })
  obtenerEstado(@Param('id', ParseUUIDPipe) id: string) {
    return this.jornadaService.obtenerEstado(id);
  }

  @Post('elecciones/:id/inicializar')
  @ApiOperation({ summary: 'Paso 1: inicializar la jornada y bloquear configuracion' })
  inicializar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasoJornadaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.inicializar(id, dto, { user, ip });
  }

  @Post('elecciones/:id/puesta-a-cero')
  @ApiOperation({ summary: 'Paso 2: verificar que no existan votos previos' })
  puestaCero(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasoJornadaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.puestaCero(id, dto, { user, ip });
  }

  @Post('elecciones/:id/iniciar-votacion')
  @ApiOperation({ summary: 'Paso 3: iniciar votacion y habilitar link de votante' })
  iniciarVotacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IniciarVotacionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.iniciarVotacion(id, dto, { user, ip });
  }

  @Post('elecciones/:id/cerrar-votacion')
  @ApiOperation({ summary: 'Paso 4: cerrar la votacion' })
  cerrarVotacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasoJornadaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.cerrarVotacion(id, dto, { user, ip });
  }

  @Post('elecciones/:id/generar-resultados')
  @ApiOperation({ summary: 'Paso 5: publicar los resultados electorales' })
  generarResultados(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasoJornadaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.generarResultados(id, dto, { user, ip });
  }

  @Post('elecciones/:id/reactivar-link')
  @ApiOperation({ summary: 'Reactivar el link de votacion' })
  reactivarLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.reactivarLink(id, { user, ip });
  }

  @Post('elecciones/:id/reiniciar')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Reiniciar la jornada (borra votos y reabre configuracion)' })
  reiniciar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReiniciarJornadaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.jornadaService.reiniciar(id, dto, { user, ip });
  }
}
