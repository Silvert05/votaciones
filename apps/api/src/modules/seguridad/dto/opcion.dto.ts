import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TipoOpcion } from 'prisma/generated/enums';

export class CreateOpcionDto {
  @ApiProperty({ example: 'seguridad.perfiles' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  codigo: string;

  @ApiProperty({ example: 'Perfiles' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  titulo: string;

  @ApiPropertyOptional({ example: 'Gestion de perfiles de acceso' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  subtitulo?: string;

  @ApiPropertyOptional({ example: '/admin/seguridad/perfiles' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  ruta?: string;

  @ApiPropertyOptional({ example: 'heroicons_outline:identification' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  icono?: string;

  @ApiPropertyOptional({ enum: TipoOpcion, default: TipoOpcion.PANTALLA })
  @IsOptional()
  @IsEnum(TipoOpcion)
  tipo?: TipoOpcion;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  @ApiPropertyOptional({ description: 'Opcion padre para construir menus' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  padreId?: string | null;
}

export class UpdateOpcionDto {
  @ApiPropertyOptional({ example: 'seguridad.perfiles' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  codigo?: string;

  @ApiPropertyOptional({ example: 'Perfiles' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  titulo?: string;

  @ApiPropertyOptional({ example: 'Gestion de perfiles de acceso' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  subtitulo?: string | null;

  @ApiPropertyOptional({ example: '/admin/seguridad/perfiles' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  ruta?: string | null;

  @ApiPropertyOptional({ example: 'heroicons_outline:identification' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  icono?: string | null;

  @ApiPropertyOptional({ enum: TipoOpcion })
  @IsOptional()
  @IsEnum(TipoOpcion)
  tipo?: TipoOpcion;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  @ApiPropertyOptional({ description: 'Opcion padre para construir menus' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  padreId?: string | null;
}

export class ToggleOpcionActivoDto {
  @ApiProperty()
  @IsBoolean()
  activo: boolean;
}
