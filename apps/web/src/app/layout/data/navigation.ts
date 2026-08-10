import { FuseNavigationItem } from '@core/components/navigation';

export const AdminNavigation: FuseNavigationItem[] = [
  {
    id: 'elections',
    title: 'Elecciones',
    type: 'group',
    icon: 'lucide:layers',
    children: [
      {
        id: 'elections.list',
        title: 'Gestión',
        type: 'basic',
        icon: 'lucide:clipboard-list',
        link: '/admin/elecciones',
      },
      {
        id: 'elections.candidates',
        title: 'Candidatos',
        type: 'basic',
        icon: 'lucide:users',
        link: '/admin/candidatos',
      },
      {
        id: 'elections.results',
        title: 'Resultados',
        type: 'basic',
        icon: 'lucide:chart-bar',
        link: '/admin/resultados',
      },
    ],
  },
  {
    id: 'divider-settings',
    type: 'divider',
    meta: { roles: ['ADMIN'] },
  },
  {
    id: 'settings',
    title: 'Configuración',
    type: 'group',
    icon: 'lucide:settings',
    meta: { roles: ['ADMIN'] },
    children: [
      {
        id: 'settings.users',
        title: 'Usuarios',
        type: 'basic',
        icon: 'lucide:users-round',
        link: '/admin/usuarios',
      },
      {
        id: 'settings.perfiles',
        title: 'Roles y perfiles',
        type: 'basic',
        icon: 'lucide:id-card',
        link: '/admin/seguridad/perfiles',
      },
      {
        id: 'settings.opciones',
        title: 'Catálogo de pantallas',
        type: 'basic',
        icon: 'lucide:grid-2x2',
        link: '/admin/seguridad/opciones',
      },
      {
        id: 'settings.auditoria',
        title: 'Auditoría',
        type: 'basic',
        icon: 'lucide:clipboard-check',
        link: '/admin/auditoria',
      },
      {
        id: 'settings.config',
        title: 'Sistema',
        type: 'basic',
        icon: 'lucide:settings',
        link: '/admin/configuracion',
      },
    ],
  },
];
