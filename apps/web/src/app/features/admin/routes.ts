import { Routes } from '@angular/router';
import { LayoutComponent } from 'app/layout/layout.component';
import { authGuard, noAuthGuard, roleGuard } from './auth/guards/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    canActivateChild: [noAuthGuard],
    component: LayoutComponent,
    data: {
      layout: 'empty'
    },
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/pages/login/login.component')
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./auth/pages/reset-password/reset-password.component')
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: '**',
        loadComponent: () =>
          import('app/shared/pages/not-found/not-found.component'),
        data: {
          title: 'Página de autenticación no encontrada',
          description: 'La ruta de acceso solicitada no existe.',
          homeLink: '/admin/auth/login',
          homeLabel: 'Ir al login'
        }
      }
    ]
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    component: LayoutComponent,
    data: {
      layout: 'admin'
    },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component')
      },
      {
        path: 'perfil',
        loadComponent: () => import('./profile/profile.component')
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./users/pages/users-list/users-list.component')
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./auditoria/pages/auditoria-list/auditoria-list.component')
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: '**',
        loadComponent: () =>
          import('app/shared/pages/not-found/not-found.component'),
        data: {
          title: 'Página administrativa no encontrada',
          description: 'La sección solicitada no existe dentro del panel.',
          homeLink: '/admin/dashboard',
          homeLabel: 'Volver al panel'
        }
      }
    ],
  },
];

export default routes;
