import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig
} from '@angular/core';
import { LuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideCore } from '@core/core.provider';
import { provideIcons } from '@core/services/icons';
import { appRoutes } from 'app/app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),

    // Material Date Adapter
    {
      provide: DateAdapter,
      useClass: LuxonDateAdapter,
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: 'D',
        },
        display: {
          dateInput: 'DDD',
          monthYearLabel: 'LLL yyyy',
          dateA11yLabel: 'DD',
          monthYearA11yLabel: 'LLLL yyyy',
        },
      },
    },

    // Fuse
    provideIcons(),
    provideCore({

      layout: 'classic',
      scheme: 'light',
      screens: {
        sm: '600px',
        md: '960px',
        lg: '1280px',
        xl: '1440px',
      },
      theme: 'theme-brand',
      themes: [
        {
          id: 'theme-default',
          name: 'Default',
        },
        {
          id: 'theme-brand',
          name: 'Brand',
        },
        {
          id: 'theme-teal',
          name: 'Teal',
        },
        {
          id: 'theme-rose',
          name: 'Rose',
        },
        {
          id: 'theme-purple',
          name: 'Purple',
        },
        {
          id: 'theme-amber',
          name: 'Amber',
        },
      ],
    }),
  ],
};
