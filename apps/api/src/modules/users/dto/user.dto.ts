import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Rol } from 'prisma/generated/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  @IsNotEmpty({ message: 'El usuario es requerido.' })
  @MaxLength(150)
  usuario: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido.' })
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ example: 'jperez@fierpi.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(150)
  email: string;

  @ApiProperty({ description: 'Contraseña temporal', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @ApiPropertyOptional({ enum: Rol, default: Rol.USER })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol no es válido.' })
  rol?: Rol;

  @ApiPropertyOptional({ description: 'Perfil de acceso asignado' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  perfilId?: string | null;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ example: 'jperez@fierpi.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol no es válido.' })
  rol?: Rol;

  @ApiPropertyOptional({ description: 'Perfil de acceso asignado' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  perfilId?: string | null;
}

export class ToggleActivoDto {
  @ApiProperty({ description: 'Estado activo del usuario' })
  @IsBoolean({ message: 'El estado debe ser booleano.' })
  activo: boolean;
}

export class ResetUserPasswordDto {
  @ApiProperty({ description: 'Nueva contraseña temporal', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;
}

export class QueryUsersDto {
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

  @ApiPropertyOptional({ description: 'Busca por usuario, nombre o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @ApiPropertyOptional({ description: 'Filtra por perfil' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUUID()
  perfilId?: string;

  @ApiPropertyOptional({ description: 'Filtra por estado activo' })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : undefined,
  )
  @IsBoolean()
  activo?: boolean;
}
