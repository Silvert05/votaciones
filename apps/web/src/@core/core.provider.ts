import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  EnvironmentProviders,
  Provider,
  importProvidersFrom,
  inject,
  provideEnvironmentInitializer
} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { CoreConfig } from '@core/services/config';
import { CORE_CONFIG } from '@core/services/config/config.constants';
import {
  FuseLoadingService,
  fuseLoadingInterceptor,
} from '@core/services/loading';
import { FuseMediaWatcherService } from '@core/services/media-watcher';
import { FusePlatformService } from '@core/services/platform';
import { FuseSplashScreenService } from '@core/services/splash-screen';
import { FuseUtilsService } from '@core/services/utils';

export const provideCore = (
  config: CoreConfig
): Array<Provider | EnvironmentProviders> => {
  // Base providers
  const providers: Array<Provider | EnvironmentProviders> = [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'fill',
      },
    },
    {
      provide: CORE_CONFIG,
      useValue: config ?? {},
    },

    importProvidersFrom(MatDialogModule),

    provideHttpClient(withInterceptors([fuseLoadingInterceptor])),
    provideEnvironmentInitializer(() => inject(FuseLoadingService)),

    provideEnvironmentInitializer(() => inject(FuseMediaWatcherService)),
    provideEnvironmentInitializer(() => inject(FusePlatformService)),
    provideEnvironmentInitializer(() => inject(FuseSplashScreenService)),
    provideEnvironmentInitializer(() => inject(FuseUtilsService)),
  ];

  // Return the providers
  return providers;
};
