import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoPadronElector, TipoElector } from 'prisma/generated/enums';

export class QueryPadronDto {
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

  @ApiPropertyOptional({ enum: EstadoPadronElector })
  @IsOptional()
  @IsEnum(EstadoPadronElector)
  estado?: EstadoPadronElector;

  @ApiPropertyOptional({ enum: TipoElector })
  @IsOptional()
  @IsEnum(TipoElector)
  tipo?: TipoElector;
}

export class AsignarElectoresDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  electorIds: string[];
}

export class UpdatePadronElectorDto {
  @ApiProperty({ enum: EstadoPadronElector })
  @IsEnum(EstadoPadronElector)
  estado: EstadoPadronElector;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string | null;
}