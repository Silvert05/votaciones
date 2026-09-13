import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { PublicThemeService } from '../../services/public-theme.service';
import { LandingEleccion, VenpService } from '../../services/venp.service';

/** Refresca el estado del portal para reflejar cambios del admin sin recargar la página. */
const REFRESCO_MS = 20000;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [RouterLink, MatIconModule],
})
export default class HomeComponent implements OnInit, OnDestroy {
  private _venp = inject(VenpService);
  private _cdr = inject(ChangeDetectorRef);
  private _publicTheme = inject(PublicThemeService);
  readonly theme = this._publicTheme.theme;

  cargando = true;
  eleccion: LandingEleccion | null = null;
  countdown = '';
  votacionFinalizada = false;
  private _timer: any = null;
  private _sub?: Subscription;

  ngOnInit(): void {
    this._sub = interval(REFRESCO_MS)
      .pipe(
        startWith(0),
        switchMap(() => this._venp.listElecciones()),
      )
      .subscribe({
        next: (data) => {
          this.eleccion = this._elegirActiva(data);
          this._publicTheme.apply(this.eleccion?.configuracion);
          this._setupCountdown();
          this.cargando = false;
          this._cdr.detectChanges();
        },
        error: () => {
          this.eleccion = null;
          this.cargando = false;
          this._cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
    this._sub?.unsubscribe();
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
