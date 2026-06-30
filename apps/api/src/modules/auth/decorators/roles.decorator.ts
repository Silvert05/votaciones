import { SetMetadata } from '@nestjs/common';
import { Rol } from 'prisma/generated/enums';

export const ROLES_KEY = 'roles';

/** Restringe el acceso a los roles indicados. Úsalo junto a RolesGuard. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
