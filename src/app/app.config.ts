import {ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID} from '@angular/core';
import {PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading} from '@angular/router';
import {registerLocaleData} from '@angular/common';
import localePtBr from '@angular/common/locales/pt';

import {routes} from './app.routes';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {authInterceptor} from "./core/interceptors/auth.interceptor";
import {provideDateFnsAdapter} from "@angular/material-date-fns-adapter";
import {MAT_DATE_LOCALE} from "@angular/material/core";
import {ptBR} from "date-fns/locale";
import {provideNgxMask} from "ngx-mask";

// Register the correct locale data for pt-BR
registerLocaleData(localePtBr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withPreloading(PreloadAllModules), // Preloads all lazy-loaded routes
      withInMemoryScrolling({ // Improves navigation UX
        scrollPositionRestoration: 'enabled', // Restores scroll position on back/forward
        anchorScrolling: 'enabled', // Scrolls to anchor fragments
      })
    ),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Provide the ngx-mask configuration globally
    provideNgxMask(),

    // Global configuration for the locale
    {provide: LOCALE_ID, useValue: 'pt-BR'},
    {provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL'},

    // Global configuration for the Material Datepicker adapter
    provideDateFnsAdapter(),
    {provide: MAT_DATE_LOCALE, useValue: ptBR},
  ]
};
