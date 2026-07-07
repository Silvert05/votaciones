import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePerfilDto {
  @ApiProperty({ example: 'Consejo Electoral' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional({ example: 'Gestiona procesos electorales institucionales' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}

export class UpdatePerfilDto {
  @ApiPropertyOptional({ example: 'Consejo Electoral' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Gestiona procesos electorales institucionales' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string | null;
}

export class TogglePerfilActivoDto {
  @ApiProperty()
  @IsBoolean()
  activo: boolean;
}

export class SetPerfilOpcionesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  opcionIds: string[];
}
