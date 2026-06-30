import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig
} from '@angular/core';
import { LuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideCore } from '@core/core.provider';
import { provideIcons } from '@core/services/icons';
import { fuseLoadingInterceptor } from '@core/services/loading';
import { appRoutes } from 'app/app.routes';
import { authInterceptor } from 'app/features/admin/auth/interceptors/auth.interceptor';
import { spanishPaginatorIntl } from 'app/shared/spanish-paginator-intl';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor, fuseLoadingInterceptor])
    ),
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
    provideIcons(),
    provideCore(),

    // Paginador de tablas en español
    { provide: MatPaginatorIntl, useFactory: spanishPaginatorIntl },
  ],
};
