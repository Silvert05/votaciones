import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
