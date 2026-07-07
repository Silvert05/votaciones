import { Routes } from '@angular/router';
import { LayoutComponent } from 'app/layout/layout.component';
import { authGuard, noAuthGuard, optionGuard, roleGuard } from './auth/guards/auth.guard';

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
        redirectTo: 'seguridad/usuarios',
        pathMatch: 'full'
      },
      {
        path: 'auditoria',
        redirectTo: 'seguridad/auditoria',
        pathMatch: 'full'
      },
      {
        path: 'seguridad/usuarios',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./users/pages/users-list/users-list.component')
      },
      {
        path: 'seguridad/perfiles',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./security/pages/perfiles/perfiles-list.component')
      },
      {
        path: 'seguridad/opciones',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./security/pages/opciones/opciones-list.component')
      },
      {
        path: 'seguridad/auditoria',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./auditoria/pages/auditoria-list/auditoria-list.component')
      },
      {
        path: 'elecciones',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./elections/pages/elections-list/elections-list.component')
      },
      {
        path: 'elecciones/cronograma',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./elections/pages/election-schedule/election-schedule.component')
      },
      {
        path: 'elecciones/dignidades',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./elections/pages/election-positions/election-positions.component')
      },
      {
        path: 'elecciones/electores',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./padron/pages/electores-list/electores-list.component')
      },
      {
        path: 'elecciones/padron',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./padron/pages/election-roll/election-roll.component')
      },
      {
        path: 'elecciones/listas',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./candidaturas/pages/listas/listas.component')
      },
      {
        path: 'elecciones/candidaturas',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./candidaturas/pages/candidaturas/candidaturas.component')
      },
      {
        path: 'elecciones/votacion',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./votacion/pages/votacion/votacion.component')
      },
      {
        path: 'elecciones/resultados',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./votacion/pages/resultados/resultados.component')
      },
      {
        path: 'elecciones/escrutinio',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./escrutinio/pages/escrutinio/escrutinio.component')
      },
      {
        path: 'elecciones/impugnaciones',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./escrutinio/pages/impugnaciones/impugnaciones.component')
      },
      {
        path: 'elecciones/resultados-finales',
        canActivate: [roleGuard(['ADMIN']), optionGuard],
        loadComponent: () =>
          import('./escrutinio/pages/resultados-finales/resultados-finales.component')
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
