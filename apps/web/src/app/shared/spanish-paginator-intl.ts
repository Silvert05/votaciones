import { MatPaginatorIntl } from '@angular/material/paginator';

/** Traduce el paginador de Angular Material al español. */
export function spanishPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();

  intl.itemsPerPageLabel = 'Por página:';
  intl.nextPageLabel = 'Página siguiente';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';

  intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }
    const total = Math.max(length, 0);
    const start = page * pageSize;
    const end =
      start < total ? Math.min(start + pageSize, total) : start + pageSize;
    return `${start + 1} – ${end} de ${total}`;
  };

  return intl;
}
