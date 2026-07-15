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
import { TipoElector } from 'prisma/generated/enums';

export class CreateDignidadDto {
  @ApiProperty({ example: 'Representante estudiantil del Instituto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ enum: TipoElector, default: TipoElector.AMBOS })
  @IsOptional()
  @IsEnum(TipoElector)
  tipoElectorPermitido?: TipoElector;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  cantidadGanadores?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiereLista?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;
}

export class UpdateDignidadDto {
  @ApiPropertyOptional({ example: 'Representante estudiantil del Instituto' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional({ enum: TipoElector })
  @IsOptional()
  @IsEnum(TipoElector)
  tipoElectorPermitido?: TipoElector;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  cantidadGanadores?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereLista?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
