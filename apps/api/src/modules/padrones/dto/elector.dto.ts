import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoElector } from 'prisma/generated/enums';

export class QueryElectoresDto {
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

  @ApiPropertyOptional({ enum: TipoElector })
  @IsOptional()
  @IsEnum(TipoElector)
  tipo?: TipoElector;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;
}

export class CreateElectorDto {
  @ApiProperty({ example: '0102030405' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  identificacion: string;

  @ApiProperty({ example: 'Maria Fernanda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombres: string;

  @ApiProperty({ example: 'Perez Lopez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  apellidos: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string | null;

  @ApiProperty({ enum: TipoElector })
  @IsEnum(TipoElector)
  tipo: TipoElector;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  carreraId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  nivelId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  paraleloId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jornadaId?: string | null;
}

export class UpdateElectorDto {
  @ApiPropertyOptional({ example: '0102030405' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  identificacion?: string;

  @ApiPropertyOptional({ example: 'Maria Fernanda' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombres?: string;

  @ApiPropertyOptional({ example: 'Perez Lopez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  apellidos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string | null;

  @ApiPropertyOptional({ enum: TipoElector })
  @IsOptional()
  @IsEnum(TipoElector)
  tipo?: TipoElector;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  carreraId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  nivelId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  paraleloId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jornadaId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class SetElectorActivoDto {
  @ApiProperty()
  @IsBoolean()
  activo: boolean;
}
