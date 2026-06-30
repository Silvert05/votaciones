import { FuseNavigationItem } from '@core/components/navigation';

/**
 * Indica si un ítem es visible para el rol dado. Un ítem sin `meta.roles`
 * es visible para todos; si declara roles, solo lo ven esos roles.
 */
function puedeVer(item: FuseNavigationItem, rol: string | null): boolean {
  const roles = item.meta?.roles as string[] | undefined;
  if (!roles || roles.length === 0) {
    return true;
  }
  return rol !== null && roles.includes(rol);
}

/** Elimina divisores huérfanos (al inicio, al final o consecutivos). */
function limpiarDivisores(items: FuseNavigationItem[]): FuseNavigationItem[] {
  const result: FuseNavigationItem[] = [];
  for (const item of items) {
    const isDivider = item.type === 'divider';
    const prev = result[result.length - 1];
    if (isDivider && (!prev || prev.type === 'divider')) {
      continue; // evita divisor al inicio o duplicado
    }
    result.push(item);
  }
  // quita divisor final
  while (result.length && result[result.length - 1].type === 'divider') {
    result.pop();
  }
  return result;
}

/**
 * Filtra recursivamente la navegación según el rol del usuario. Los grupos /
 * colapsables que quedan sin hijos visibles se descartan.
 */
export function filterNavigationByRole(
  items: FuseNavigationItem[],
  rol: string | null,
): FuseNavigationItem[] {
  const filtered: FuseNavigationItem[] = [];

  for (const item of items) {
    if (!puedeVer(item, rol)) {
      continue;
    }

    if (item.children?.length) {
      const children = filterNavigationByRole(item.children, rol);
      const esContenedor =
        item.type === 'group' ||
        item.type === 'collapsable' ||
        item.type === 'aside';
      if (children.length === 0 && esContenedor) {
        continue;
      }
      filtered.push({ ...item, children });
    } else {
      filtered.push(item);
    }
  }

  return limpiarDivisores(filtered);
}
