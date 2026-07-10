import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class PasoJornadaDto {
  @ApiPropertyOptional({ example: 'Sin novedades. Todas las mesas listas.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reporte?: string;
}

export class IniciarVotacionDto extends PasoJornadaDto {
  @ApiPropertyOptional({
    example: '2026-06-30T18:00:00.000Z',
    description: 'Fecha/hora de cierre de la jornada (para el cronometro).',
  })
  @IsOptional()
  @IsISO8601()
  fechaFinVotacion?: string;
}
