import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoEleccion, TipoEleccion } from 'prisma/generated/enums';

export class CreateEleccionDto {
  @ApiProperty({ example: 'Eleccion de representantes al OCS 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ enum: TipoEleccion })
  @IsEnum(TipoEleccion)
  tipo: TipoEleccion;

  @ApiPropertyOptional({ example: '2026-08-01T08:00:00.000Z' })
  @IsOptional()
  @IsString()
  fechaConvocatoria?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  aprobadaPorOcs?: boolean;
}

export class UpdateEleccionDto {
  @ApiPropertyOptional({ example: 'Eleccion de representantes al OCS 2026' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional({ enum: TipoEleccion })
  @IsOptional()
  @IsEnum(TipoEleccion)
  tipo?: TipoEleccion;

  @ApiPropertyOptional({ example: '2026-08-01T08:00:00.000Z' })
  @IsOptional()
  @IsString()
  fechaConvocatoria?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aprobadaPorOcs?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  vueltaActual?: number;
}

export class QueryEleccionesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TipoEleccion })
  @IsOptional()
  @IsEnum(TipoEleccion)
  tipo?: TipoEleccion;

  @ApiPropertyOptional({ enum: EstadoEleccion })
  @IsOptional()
  @IsEnum(EstadoEleccion)
  estado?: EstadoEleccion;
}

export class CambiarEstadoEleccionDto {
  @ApiProperty({ enum: EstadoEleccion })
  @IsEnum(EstadoEleccion)
  estado: EstadoEleccion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  comentario?: string;
}
