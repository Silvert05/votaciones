import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
