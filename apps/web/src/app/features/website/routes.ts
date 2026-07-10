import { Routes } from '@angular/router';
import { LayoutComponent } from 'app/layout/layout.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    data: {
      layout: 'website'
    },
    children: [
      { path: 'inicio', loadComponent: () => import('./pages/home/home.component') },
      { path: 'actividades', loadComponent: () => import('./pages/actividades/actividades') },
      { path: 'candidatos', loadComponent: () => import('./pages/candidatos/candidatos') },
      { path: 'votar', loadComponent: () => import('./pages/votar/votar') },
      { path: 'participacion', loadComponent: () => import('./pages/participacion/participacion') },
      { path: 'resultados', loadComponent: () => import('./pages/resultados/resultados') },
      { path: 'instructivo', loadComponent: () => import('./pages/instructivo/instructivo') },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: '**',
        loadComponent: () => import('app/shared/pages/not-found/not-found.component'),
        data: {
          homeLink: '/inicio',
          homeLabel: 'Volver al inicio',
        },
      },
    ],
  },
];

export default routes;
