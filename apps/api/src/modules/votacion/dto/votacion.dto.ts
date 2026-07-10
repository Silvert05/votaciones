import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { TipoVoto } from 'prisma/generated/enums';

export class VotoSeleccionDto {
  @ApiProperty()
  @IsUUID('4')
  dignidadId: string;

  @ApiProperty({ enum: TipoVoto })
  @IsEnum(TipoVoto)
  tipo: TipoVoto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  candidaturaId?: string | null;
}

export class EmitirVotoDto {
  @ApiProperty({ example: '0102030405' })
  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @ApiProperty({ type: [VotoSeleccionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VotoSeleccionDto)
  votos: VotoSeleccionDto[];
}

export class TarjetonQueryDto {
  @ApiPropertyOptional({ example: '0102030405' })
  @IsOptional()
  @IsString()
  identificacion?: string;
}

export class VotanteLoginDto {
  @ApiProperty({ example: '0102030405', description: 'DNI / identificacion del elector' })
  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @ApiProperty({ example: 'AB12CD34' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class EmitirVotanteDto {
  @ApiProperty({ type: [VotoSeleccionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VotoSeleccionDto)
  votos: VotoSeleccionDto[];
}
