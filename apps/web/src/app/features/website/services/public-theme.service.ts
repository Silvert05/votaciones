import { Injectable, signal } from '@angular/core';
import { ConfiguracionEleccion } from './venp.service';

export interface PublicTheme {
  nombreInstitucion: string;
  logoUrl: string;
  escudoUrl: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
  mensajeBienvenida: string;
}

const DEFAULT_THEME: PublicTheme = {
  nombreInstitucion: 'Instituto Superior Tecnológico Yavirac',
  logoUrl: '/img/logo.png',
  escudoUrl: '/img/logo.png',
  colorPrimario: '#1d4ed8',
  colorSecundario: '#0ea5e9',
  colorAcento: '#f59e0b',
  mensajeBienvenida: 'Bienvenido al portal electoral del Instituto Yavirac.',
};

@Injectable({ providedIn: 'root' })
export class PublicThemeService {
  readonly theme = signal<PublicTheme>(DEFAULT_THEME);

  apply(config: ConfiguracionEleccion | null | undefined): void {
    this.theme.set({
      nombreInstitucion: config?.nombreInstitucion || DEFAULT_THEME.nombreInstitucion,
      logoUrl: this.asset(config?.logoUrl, DEFAULT_THEME.logoUrl),
      escudoUrl: this.asset(config?.escudoUrl, DEFAULT_THEME.escudoUrl),
      colorPrimario: this.color(config?.colorPrimario, DEFAULT_THEME.colorPrimario),
      colorSecundario: this.color(config?.colorSecundario, DEFAULT_THEME.colorSecundario),
      colorAcento: this.color(config?.colorAcento, DEFAULT_THEME.colorAcento),
      mensajeBienvenida: config?.mensajeBienvenida || DEFAULT_THEME.mensajeBienvenida,
    });
  }

  private color(value: string | null | undefined, fallback: string): string {
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  }

  private asset(value: string | null | undefined, fallback: string): string {
    const url = value?.trim();
    if (!url || /placehold\.co|text=(une|escudo)/i.test(url)) return fallback;
    return url;
  }
}
