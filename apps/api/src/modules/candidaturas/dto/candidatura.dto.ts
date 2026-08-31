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
import {
  EstadoCandidatura,
  EstadoImpugnacionResultado,
} from 'prisma/generated/enums';

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

  @ApiPropertyOptional({
    description: 'Cumple al menos 40% de materias aprobadas de la carrera (Art. 4, Cap. 4)',
  })
  @IsOptional()
  @IsBoolean()
  cumpleAprobadoCarrera?: boolean;

  @ApiPropertyOptional({
    description: 'Cumple el promedio academico minimo del 80% (Art. 4, Cap. 4)',
  })
  @IsOptional()
  @IsBoolean()
  cumplePromedioAcademico?: boolean;

  @ApiPropertyOptional({
    description: 'Sancionado por una terna propuesta al Organo Colegiado Superior (Art. 4, Cap. 4)',
  })
  @IsOptional()
  @IsBoolean()
  sancionado?: boolean;
}

export class SubsanarCandidaturaDto {
  @ApiPropertyOptional({
    description: 'Notas sobre la documentacion corregida presentada.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string | null;
}

export class ImpugnarCalificacionDto {
  @ApiProperty({ example: 'Lista A / Representante acreditado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  presentadoPor: string;

  @ApiProperty({
    description: 'Correo para notificar la resolucion (Art. 14).',
  })
  @IsEmail()
  correoNotificacion: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fundamento: string;
}

export class ResolverImpugnacionCandidaturaDto {
  @ApiProperty({ enum: EstadoImpugnacionResultado })
  @IsEnum(EstadoImpugnacionResultado)
  estado: EstadoImpugnacionResultado;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resolucion: string;
}