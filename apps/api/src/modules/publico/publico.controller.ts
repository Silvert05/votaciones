import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ReportesService } from '../reportes/reportes.service';
import { Votante } from '../votacion/decorators/votante.decorator';
import { VotoGuard } from '../votacion/guards/voto.guard';
import {
  EmitirVotanteDto,
  VotanteLoginDto,
} from '../votacion/dto/votacion.dto';
import { VotacionService } from '../votacion/votacion.service';
import { PublicoService } from './publico.service';

@ApiTags('Publico (VENP)')
@Controller('publico')
export class PublicoController {
  constructor(
    private readonly publicoService: PublicoService,
    private readonly votacionService: VotacionService,
    private readonly reportesService: ReportesService,
  ) {}

  @Get('instructivo')
  @ApiOperation({ summary: 'Descargar el instructivo de votacion (PDF)' })
  async instructivo(@Res() res: Response) {
    const buffer = await this.reportesService.instructivoPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="instructivo-votacion.pdf"',
    );
    res.send(buffer);
  }

  @Get('elecciones')
  @ApiOperation({ summary: 'Listar elecciones visibles al publico' })
  listElecciones() {
    return this.publicoService.listElecciones();
  }

  @Get('elecciones/:id')
  @ApiOperation({ summary: 'Datos de la landing de una eleccion' })
  landing(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicoService.landing(id);
  }

  @Get('elecciones/:id/resultados')
  @ApiOperation({ summary: 'Resultados publicos de una eleccion' })
  resultados(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicoService.resultados(id);
  }

  @Get('elecciones/:id/participacion')
  @ApiOperation({ summary: 'Participacion en tiempo real' })
  participacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicoService.participacion(id);
  }

  @Get('elecciones/:id/candidatos')
  @ApiOperation({ summary: 'Candidaturas calificadas por dignidad' })
  candidatos(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicoService.candidatos(id);
  }

  @Post('elecciones/:id/votante/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ingreso del votante con DNI y contrasena' })
  loginVotante(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VotanteLoginDto,
  ) {
    return this.votacionService.loginVotante(id, dto);
  }

  @Get('votante/tarjeton')
  @UseGuards(VotoGuard)
  @ApiOperation({ summary: 'Cedulas de votacion del elector autenticado' })
  tarjetonVotante(
    @Votante('eleccionId') eleccionId: string,
    @Votante('sub') electorId: string,
  ) {
    return this.votacionService.tarjetonVotante(eleccionId, electorId);
  }

  @Post('votante/emitir')
  @UseGuards(VotoGuard)
  @ApiOperation({ summary: 'Emitir el voto del elector autenticado' })
  emitirVotante(
    @Votante('eleccionId') eleccionId: string,
    @Votante('sub') electorId: string,
    @Body() dto: EmitirVotanteDto,
    @Ip() ip: string,
  ) {
    return this.votacionService.emitirVotante(eleccionId, electorId, dto, ip);
  }
}
