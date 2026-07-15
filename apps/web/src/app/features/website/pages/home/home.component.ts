import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PublicThemeService } from '../../services/public-theme.service';
import { LandingEleccion, VenpService } from '../../services/venp.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [RouterLink, MatIconModule],
})
export default class HomeComponent implements OnInit, OnDestroy {
  private _venp = inject(VenpService);
  private _sanitizer = inject(DomSanitizer);
  private _cdr = inject(ChangeDetectorRef);
  private _publicTheme = inject(PublicThemeService);
  readonly theme = this._publicTheme.theme;

  cargando = true;
  eleccion: LandingEleccion | null = null;
  countdown = '';
  votacionFinalizada = false;
  videoPath: SafeResourceUrl | null = null;
  private _timer: any = null;

  ngOnInit(): void {
    this._venp.listElecciones().pipe(
      finalize(() => {
        this.cargando = false;
        this._cdr.detectChanges();
      }),
    ).subscribe({
      next: (data) => {
        this.eleccion = this._elegirActiva(data);
        this._publicTheme.apply(this.eleccion?.configuracion);
        const videoUrl = this.eleccion?.configuracion?.videoUrl;
        this.videoPath = videoUrl
          ? this._sanitizer.bypassSecurityTrustResourceUrl(videoUrl)
          : null;
        this._setupCountdown();
      },
      error: () => (this.eleccion = null),
    });
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }

  get config() {
    return this.eleccion?.configuracion ?? null;
  }

  get colorPrimario(): string {
    return this.theme().colorPrimario;
  }

  get colorSecundario(): string {
    return this.theme().colorSecundario;
  }

  get colorAcento(): string {
    return this.theme().colorAcento;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/img/logo.png')) image.src = '/img/logo.png';
  }

  private _elegirActiva(data: LandingEleccion[]): LandingEleccion | null {
    if (!data?.length) return null;
    return data.find((e) => e.votarDisponible) ??
      data.find((e) => e.resultadosDisponibles) ?? data[0];
  }

  private _setupCountdown(): void {
    if (this._timer) clearInterval(this._timer);
    const fin = this.eleccion?.fechaFinVotacion;
    if (!fin) return;
    const tick = () => {
      const diff = new Date(fin).getTime() - Date.now();
      if (diff <= 0) {
        this.countdown = '00:00:00';
        this.votacionFinalizada = true;
        if (this._timer) clearInterval(this._timer);
      } else {
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1000);
        this.countdown = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
      }
      this._cdr.detectChanges();
    };
    tick();
    this._timer = setInterval(tick, 1000);
  }
}
