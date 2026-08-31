import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertCronogramaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaConvocatoria?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaPublicacionPadron?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaInicioInscripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaFinInscripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaInicioImpugnacionCandidaturas?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaFinImpugnacionCandidaturas?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaPublicacionCandidaturas?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaInicioCampania?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaFinCampania?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaInicioVotacion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaFinVotacion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaPublicacionResultados?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaFinImpugnacionResultados?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaResultadosFinales?: string | null;

  @ApiPropertyOptional({
    description: 'Lugar/plataforma de votacion (Art. 10.7 del reglamento).',
    example: 'Plataforma de voto electronico: https://votaciones.yavirac.edu.ec',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lugarVotacion?: string | null;

  @ApiPropertyOptional({
    description:
      'Detalle opcional por hito fijo: fecha de fin (rango) y/o descripcion. Clave = nombre de campo de fecha fija.',
    example: {
      fechaInicioInscripcion: {
        fechaFin: '2026-06-20T17:00:00.000Z',
        descripcion: 'Recepcion de carpetas en Secretaria General.',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  detallesHitos?: Record<
    string,
    { fechaFin?: string | null; descripcion?: string | null }
  > | null;
}

export class UpdateOrdenCronogramaDto {
  @ApiProperty({
    description:
      'Orden de publicacion de los hitos: nombres de campo de fecha fija (p.ej. "fechaInicioVotacion") o "item:<id>" para items libres.',
    example: ['fechaConvocatoria', 'item:8f14e...', 'fechaInicioVotacion'],
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  orden: string[];
}

export class PublicarCronogramaDto {
  @ApiProperty({
    description:
      'true = el cronograma se muestra en el portal publico; false = queda como borrador.',
    example: true,
  })
  @IsBoolean()
  publicado: boolean;
}

export class UpdateEtiquetasCronogramaDto {
  @ApiProperty({
    description:
      'Mapa "campo fijo -> titulo publico personalizado" (p.ej. { "fechaInicioVotacion": "Apertura de urnas" }).',
    example: { fechaInicioVotacion: 'Apertura de urnas' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  etiquetas: Record<string, string>;
}
