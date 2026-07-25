import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from 'prisma/generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CorreoService } from './correo.service';

@ApiTags('Correo')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('correo')
export class CorreoController {
  constructor(private readonly correoService: CorreoService) {}

  @Get('estado')
  @ApiOperation({ summary: 'Consultar el modo y estado del correo' })
  estado() {
    return this.correoService.estado();
  }

  @Get('buzon-pruebas')
  @ApiOperation({ summary: 'Listar correos generados en el modo local' })
  buzonPruebas() {
    return this.correoService.listarBuzonPruebas();
  }

  @Delete('buzon-pruebas')
  @ApiOperation({ summary: 'Vaciar el buzon local de pruebas' })
  limpiarBuzonPruebas() {
    return this.correoService.limpiarBuzonPruebas();
  }
}
