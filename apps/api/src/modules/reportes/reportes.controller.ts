import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Rol } from 'prisma/generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('elecciones/:eleccionId/acta-lista')
  @ApiOperation({ summary: 'Descargar acta de resultados por lista (PDF)' })
  async actaPorLista(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.actaPorLista(eleccionId);
    this.send(res, buffer, 'acta-por-lista.pdf');
  }

  @Get('elecciones/:eleccionId/participacion-tipo')
  @ApiOperation({
    summary: 'Descargar participacion por tipo de elector (PDF)',
  })
  async participacionPorTipo(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.participacionPorTipo(eleccionId);
    this.send(res, buffer, 'participacion-por-tipo.pdf');
  }

  @Get('elecciones/:eleccionId/acta-dignidades')
  @ApiOperation({ summary: 'Descargar acta de resultados por dignidad (PDF)' })
  async actaPorDignidades(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportesService.actaPorDignidades(eleccionId);
    this.send(res, buffer, 'acta-por-dignidades.pdf');
  }

  private send(res: Response, buffer: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
