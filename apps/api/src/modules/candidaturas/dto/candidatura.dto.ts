import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoCandidatura } from 'prisma/generated/enums';

export class QueryCandidaturasDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  dignidadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  listaId?: string;

  @ApiPropertyOptional({ enum: EstadoCandidatura })
  @IsOptional()
  @IsEnum(EstadoCandidatura)
  estado?: EstadoCandidatura;
}

export class CreateCandidaturaDto {
  @ApiProperty()
  @IsUUID('4')
  dignidadId: string;

  @ApiProperty()
  @IsUUID('4')
  electorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  listaId?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;
}

export class UpdateCandidaturaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  listaId?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  @ApiPropertyOptional({ enum: EstadoCandidatura })
  @IsOptional()
  @IsEnum(EstadoCandidatura)
  estado?: EstadoCandidatura;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string | null;
}

export class CalificarCandidaturaDto {
  @ApiProperty({ enum: EstadoCandidatura })
  @IsEnum(EstadoCandidatura)
  estado: EstadoCandidatura;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string | null;
}