import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertConfiguracionEleccionDto {
  @ApiPropertyOptional({ example: 'Universidad Nacional Ejemplo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreInstitucion?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.edu/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.ejemplo.edu/escudo.png' })
  @IsOptional()
  @IsString()
  escudoUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://youtube.com/embed/AnuLEj7suo8' })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({ example: '#1d4ed8' })
  @IsOptional()
  @IsHexColor()
  colorPrimario?: string | null;

  @ApiPropertyOptional({ example: '#0ea5e9' })
  @IsOptional()
  @IsHexColor()
  colorSecundario?: string | null;

  @ApiPropertyOptional({ example: '#f59e0b' })
  @IsOptional()
  @IsHexColor()
  colorAcento?: string | null;

  @ApiPropertyOptional({ example: 'Bienvenido al sistema de voto electronico.' })
  @IsOptional()
  @IsString()
  mensajeBienvenida?: string | null;
}
