import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Restringe el acceso a usuarios ADMIN o a usuarios cuyo Perfil tenga
 * asignado alguno de los codigos de Opcion indicados (OR). Úsalo junto a
 * PermissionGuard. Pasa varios codigos cuando el endpoint es una base
 * compartida por varias pantallas (ej. listar/obtener una elección).
 */
export const RequirePermission = (...codigos: string[]) =>
  SetMetadata(PERMISSION_KEY, codigos);
