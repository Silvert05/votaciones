import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryAuditoriaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Filtra por tabla/contexto' })
  @IsOptional()
  @IsString()
  tabla?: string;

  @ApiPropertyOptional({ description: 'Filtra por operación' })
  @IsOptional()
  @IsString()
  operacion?: string;

  @ApiPropertyOptional({ description: 'Filtra por usuario que ejecutó' })
  @IsOptional()
  @IsString()
  usuario?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO)' })
  @IsOptional()
  @IsString()
  desde?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO)' })
  @IsOptional()
  @IsString()
  hasta?: string;
}
