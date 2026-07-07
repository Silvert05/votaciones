import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
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
import { EmitirVotoDto, TarjetonQueryDto } from './dto/votacion.dto';
import { VotacionService } from './votacion.service';

@ApiTags('Votacion')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('votacion')
export class VotacionController {
  constructor(private readonly votacionService: VotacionService) {}

  @Post('elecciones/:eleccionId/abrir')
  @ApiOperation({ summary: 'Abrir jornada de votacion' })
  abrirVotacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.votacionService.abrirVotacion(eleccionId, { user, ip });
  }

  @Post('elecciones/:eleccionId/cerrar')
  @ApiOperation({ summary: 'Cerrar jornada de votacion' })
  cerrarVotacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.votacionService.cerrarVotacion(eleccionId, { user, ip });
  }

  @Get('elecciones/:eleccionId/tarjeton')
  @ApiOperation({ summary: 'Obtener tarjeton electoral' })
  tarjeton(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Query() query: TarjetonQueryDto,
  ) {
    return this.votacionService.tarjeton(eleccionId, query);
  }

  @Post('elecciones/:eleccionId/votar')
  @ApiOperation({ summary: 'Emitir voto por todas las dignidades' })
  emitirVoto(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() dto: EmitirVotoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.votacionService.emitirVoto(eleccionId, dto, { user, ip });
  }

  @Get('elecciones/:eleccionId/resultados')
  @ApiOperation({ summary: 'Consultar resumen y conteos de votacion' })
  resultados(@Param('eleccionId', ParseUUIDPipe) eleccionId: string) {
    return this.votacionService.resultados(eleccionId);
  }
}
