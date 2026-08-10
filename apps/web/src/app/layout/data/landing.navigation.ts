import { Navigation } from '@core/services/navigation';

export const DataNavigation: Navigation = {
  'compact': [],
  'default': [
    {
      id: 'home',
      title: 'INICIO',
      type: 'basic',
      link: '/inicio'
    },
    {
      id: 'calendario',
      title: 'CALENDARIO ACTIVIDADES',
      type: 'basic',
      link: '/actividades'
    },
    {
      id: 'candidato',
      title: 'CANDIDATOS',
      type: 'basic',
      link: '/candidatos'
    },
    {
      id: 'participacion',
      title: 'PARTICIPACIÓN',
      type: 'basic',
      link: '/participacion'
    },
    {
      id: 'resultados',
      title: 'RESULTADOS',
      type: 'basic',
      link: '/resultados'
    },
    {
      id: 'instructivo',
      title: 'INSTRUCTIVO',
      type: 'basic',
      link: '/instructivo'
    }, {
      id: 'divider-1',
      type: 'divider'
    },
    {
      id: 'login',
      title: 'INICIAR SESIÓN',
      type: 'basic',
      icon: 'lucide:log-in',
      link: '/admin/auth/login',
      classes: {
        wrapper: 'px-2 bg-yellow-300 text-black rounded-full'
      },
    },
  ],
  'futuristic': [],
  'horizontal': [
    {
      id: 'home',
      title: 'INICIO',
      type: 'basic',
      link: '/inicio'
    },
    {
      id: 'calendario',
      title: 'CALENDARIO ACTIVIDADES',
      type: 'basic',
      link: '/actividades'
    },
    {
      id: 'candidato',
      title: 'CANDIDATOS',
      type: 'basic',
      link: '/candidatos'
    },
    {
      id: 'participacion',
      title: 'PARTICIPACIÓN',
      type: 'basic',
      link: '/participacion'
    },
    {
      id: 'resultados',
      title: 'RESULTADOS',
      type: 'basic',
      link: '/resultados'
    },
    {
      id: 'instructivo',
      title: 'INSTRUCTIVO',
      type: 'basic',
      link: '/instructivo'
    }

  ]
}
