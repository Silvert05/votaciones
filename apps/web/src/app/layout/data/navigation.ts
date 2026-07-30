import { FuseNavigationItem } from '@core/components/navigation';

export const AdminNavigation: FuseNavigationItem[] = [
  {
    id: 'elections',
    title: 'Elecciones',
    type: 'group',
    icon: 'heroicons_outline:rectangle-stack',
    children: [
      {
        id: 'elections.list',
        title: 'Gestión',
        type: 'basic',
        icon: 'heroicons_outline:clipboard-document-list',
        link: '/admin/elecciones',
      },
      {
        id: 'elections.candidates',
        title: 'Candidatos',
        type: 'basic',
        icon: 'heroicons_outline:users',
        link: '/admin/candidatos',
      },
      {
        id: 'elections.results',
        title: 'Resultados',
        type: 'basic',
        icon: 'heroicons_outline:chart-bar',
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
    icon: 'heroicons_outline:cog-6-tooth',
    meta: { roles: ['ADMIN'] },
    children: [
      {
        id: 'settings.users',
        title: 'Usuarios',
        type: 'basic',
        icon: 'heroicons_outline:user-group',
        link: '/admin/usuarios',
      },
      {
        id: 'settings.auditoria',
        title: 'Auditoría',
        type: 'basic',
        icon: 'heroicons_outline:clipboard-document-check',
        link: '/admin/auditoria',
      },
      {
        id: 'settings.config',
        title: 'Sistema',
        type: 'basic',
        icon: 'heroicons_outline:cog-8-tooth',
        link: '/admin/configuracion',
      },
    ],
  },
];
