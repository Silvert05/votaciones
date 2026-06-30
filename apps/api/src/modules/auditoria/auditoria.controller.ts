import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from 'prisma/generated/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditoriaService } from './auditoria.service';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';

@ApiTags('Auditoría')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de auditoría (logs)' })
  findAll(@Query() query: QueryAuditoriaDto) {
    return this.auditoriaService.findAll(query);
  }
}
