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
  CreateImpugnacionResultadoDto,
  ObservacionActaDto,
  ResolverImpugnacionResultadoDto,
} from './dto/escrutinio.dto';
import { EscrutinioService } from './escrutinio.service';

@ApiTags('Escrutinio')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('escrutinio')
export class EscrutinioController {
  constructor(private readonly escrutinioService: EscrutinioService) {}

  @Get('elecciones/:eleccionId/resumen')
  @ApiOperation({ summary: 'Consultar actas, resultados e impugnaciones' })
  resumen(@Param('eleccionId', ParseUUIDPipe) eleccionId: string) {
    return this.escrutinioService.resumen(eleccionId);
  }

  @Post('elecciones/:eleccionId/generar-actas')
  @ApiOperation({ summary: 'Generar actas desde el conteo de votos' })
  generarActas(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.generarActas(eleccionId, { user, ip });
  }

  @Post('actas/:actaId/cerrar')
  @ApiOperation({ summary: 'Cerrar acta de escrutinio' })
  cerrarActa(
    @Param('actaId', ParseUUIDPipe) actaId: string,
    @Body() dto: ObservacionActaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.cerrarActa(actaId, dto, { user, ip });
  }

  @Post('actas/:actaId/aprobar')
  @ApiOperation({ summary: 'Aprobar acta de escrutinio' })
  aprobarActa(
    @Param('actaId', ParseUUIDPipe) actaId: string,
    @Body() dto: ObservacionActaDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.aprobarActa(actaId, dto, { user, ip });
  }

  @Post('elecciones/:eleccionId/publicar-provisionales')
  @ApiOperation({ summary: 'Publicar resultados provisionales' })
  publicarProvisionales(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.publicarProvisionales(eleccionId, { user, ip });
  }

  @Post('elecciones/:eleccionId/impugnaciones')
  @ApiOperation({ summary: 'Registrar impugnacion de resultados' })
  crearImpugnacion(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Body() dto: CreateImpugnacionResultadoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.crearImpugnacion(eleccionId, dto, {
      user,
      ip,
    });
  }

  @Patch('impugnaciones/:impugnacionId/resolver')
  @ApiOperation({ summary: 'Resolver impugnacion de resultados' })
  resolverImpugnacion(
    @Param('impugnacionId', ParseUUIDPipe) impugnacionId: string,
    @Body() dto: ResolverImpugnacionResultadoDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.resolverImpugnacion(
      impugnacionId,
      dto,
      { user, ip },
    );
  }

  @Post('elecciones/:eleccionId/publicar-definitivos')
  @ApiOperation({ summary: 'Publicar resultados definitivos' })
  publicarDefinitivos(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.escrutinioService.publicarDefinitivos(eleccionId, { user, ip });
  }
}
