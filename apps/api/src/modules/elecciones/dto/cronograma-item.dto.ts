import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCronogramaItemDto {
  @ApiProperty({ example: 'Capacitación a delegados de mesa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre: string;

  @ApiPropertyOptional({
    description:
      'Fecha de inicio del ítem. Opcional: puede enviarse solo "fecha", solo "fechaFin" (fecha límite) o ambas (rango). Debe haber al menos una.',
    example: '2026-06-10T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  fecha?: string | null;

  @ApiPropertyOptional({
    description: 'Fecha de fin / fecha límite del ítem.',
    example: '2026-06-12T17:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  fechaFin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class UpdateCronogramaItemDto {
  @ApiPropertyOptional({ example: 'Capacitación a delegados de mesa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio. Enviar null para quitarla (ítem "solo fecha límite").',
    example: '2026-06-10T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  fecha?: string | null;

  @ApiPropertyOptional({
    description: 'Fecha de fin / fecha límite. Enviar null para quitarla.',
    example: '2026-06-12T17:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  fechaFin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string | null;
}
