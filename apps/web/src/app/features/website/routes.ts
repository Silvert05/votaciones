import { Routes } from '@angular/router';
import { LayoutComponent } from 'app/layout/layout.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    data: {
      layout: 'enterprise'
    },
    children: [
      { path: 'inicio', loadComponent: () => import('./pages/home/home.component') },
      { path: 'actividades', loadComponent: () => import('./pages/actividades/actividades') },
      { path: 'candidatos', loadComponent: () => import('./pages/candidatos/candidatos') },
      { path: 'participacion', loadComponent: () => import('./pages/participacion/participacion') },
      { path: 'resultados', loadComponent: () => import('./pages/resultados/resultados') },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
];

export default routes;