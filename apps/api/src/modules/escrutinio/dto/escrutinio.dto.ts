import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
import { EstadoImpugnacionResultado } from 'prisma/generated/enums';

export class ObservacionActaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string | null;
}

export class CreateImpugnacionResultadoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  dignidadId?: string | null;

  @ApiProperty({ example: 'Lista A / Representante acreditado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  presentadoPor: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fundamento: string;

  @ApiProperty({
    type: [String],
    description:
      'Cedulas de los electores que respaldan la impugnacion. Art. 19: se requiere respaldo de al menos el 10% del padron electoral.',
    example: ['1712345678', '1798765432'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'La impugnacion requiere electores que la respalden.' })
  @IsString({ each: true })
  respaldoIdentificaciones: string[];
}

export class IniciarSegundaVueltaDto {
  @ApiPropertyOptional({
    description:
      'Plazo en horas para la segunda votacion (Art. 18: maximo 3 dias / 72 horas).',
    example: 72,
    default: 72,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(72)
  plazoHoras?: number;
}

export class ResolverImpugnacionResultadoDto {
  @ApiProperty({ enum: EstadoImpugnacionResultado })
  @IsEnum(EstadoImpugnacionResultado)
  estado: EstadoImpugnacionResultado;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resolucion: string;
}
