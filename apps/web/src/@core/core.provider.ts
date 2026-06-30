import {
  EnvironmentProviders,
  Provider,
  importProvidersFrom,
  inject,
  provideEnvironmentInitializer
} from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { CORE_CONFIG } from '@core/services/config/config.constants';
import { FuseLoadingService } from '@core/services/loading';
import { FuseMediaWatcherService } from '@core/services/media-watcher';
import { FusePlatformService } from '@core/services/platform';
import { FuseSplashScreenService } from '@core/services/splash-screen';
import { FuseUtilsService } from '@core/services/utils';

export const provideCore = (
): Array<Provider | EnvironmentProviders> => {
  // Base providers
  const providers: Array<Provider | EnvironmentProviders> = [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'fill',
        floatLabel: 'always',
        subscriptSizing: 'dynamic',
      },
    },
    {
      provide: CORE_CONFIG,
      useValue: {

        layout: 'empty',
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
      },
    },

    importProvidersFrom(MatDialogModule),

    provideEnvironmentInitializer(() => inject(FuseLoadingService)),

    provideEnvironmentInitializer(() => inject(FuseMediaWatcherService)),
    provideEnvironmentInitializer(() => inject(FusePlatformService)),
    provideEnvironmentInitializer(() => inject(FuseSplashScreenService)),
    provideEnvironmentInitializer(() => inject(FuseUtilsService)),
  ];

  // Return the providers
  return providers;
};
