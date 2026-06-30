import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/routes'),
  },
  {
    path: '',
    loadChildren: () => import('./features/website/routes'),
  }
];
