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
  @ApiProperty({ example: 'Eleccion institucional Yavirac 2026' })
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
}

export class UpdateEleccionDto {
  @ApiPropertyOptional({ example: 'Eleccion institucional Yavirac 2026' })
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

export class SetPortalPublicoDto {
  @ApiProperty({
    description:
      'true = esta eleccion pasa a ser la que muestra el portal publico (desactiva la anterior); false = el portal queda sin proceso activo.',
    example: true,
  })
  @IsBoolean()
  portalPublico: boolean;
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
