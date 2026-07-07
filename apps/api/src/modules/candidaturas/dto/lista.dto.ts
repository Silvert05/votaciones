import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoListaElectoral } from 'prisma/generated/enums';

export class QueryListasDto {
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

  @ApiPropertyOptional({ enum: EstadoListaElectoral })
  @IsOptional()
  @IsEnum(EstadoListaElectoral)
  estado?: EstadoListaElectoral;
}

export class CreateListaDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo: string;

  @ApiProperty({ example: 'Lista Unidad Institucional' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre: string;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propuesta?: string | null;
}

export class UpdateListaDto {
  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo?: string;

  @ApiPropertyOptional({ example: 'Lista Unidad Institucional' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre?: string;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propuesta?: string | null;

  @ApiPropertyOptional({ enum: EstadoListaElectoral })
  @IsOptional()
  @IsEnum(EstadoListaElectoral)
  estado?: EstadoListaElectoral;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string | null;
}