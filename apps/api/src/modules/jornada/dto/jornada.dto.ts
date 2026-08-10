import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PasoJornadaDto {
  @ApiPropertyOptional({ example: 'Sin novedades. Todas las mesas listas.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reporte?: string;

  @ApiPropertyOptional({
    description:
      'Fuerza el paso antes de la fecha configurada en el cronograma (cierre/publicacion anticipados).',
  })
  @IsOptional()
  @IsBoolean()
  forzar?: boolean;
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

export class ReiniciarJornadaDto {
  @ApiProperty({
    example: 'Falla del proveedor de correo impidio el envio de credenciales.',
    description:
      'Justificacion obligatoria: esta accion borra todos los votos registrados.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Debe justificar el reinicio de la jornada.' })
  @MinLength(10, { message: 'La justificacion debe ser mas detallada.' })
  @MaxLength(500)
  motivo: string;
}
