import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
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
