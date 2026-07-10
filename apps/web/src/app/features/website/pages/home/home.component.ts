import { DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LandingEleccion, VenpService } from '../../services/venp.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [RouterLink, MatIconModule, DatePipe],
})
export default class HomeComponent implements OnInit, OnDestroy {
  private _venp = inject(VenpService);
  private _sanitizer = inject(DomSanitizer);
  private _cdr = inject(ChangeDetectorRef);

  cargando = true;
  eleccion: LandingEleccion | null = null;

  countdown = '';
  votacionFinalizada = false;
  private _timer: any = null;

  teams = [
    { name: 'Víctor Betun', position: 'Presidente', photo: 'https://i.pravatar.cc/300?u=10' },
    { name: 'José Avemañay', position: 'Secretario', photo: 'https://i.pravatar.cc/300?u=20' },
    { name: 'Norma Yumbo', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=30' },
    { name: 'Mario Guaman', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=40' },
    { name: 'María Yucailla', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=50' },
    { name: 'Daniel Coyago', position: 'Vocal', photo: 'https://i.pravatar.cc/300?u=60' },
  ];

  file = 'https://pdfobject.com/pdf/sample.pdf';
  path: SafeResourceUrl;

  ngOnInit(): void {
    this.path = this._sanitizer.bypassSecurityTrustResourceUrl(this.file);
    this._venp
      .listElecciones()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this._cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.eleccion = this._elegirActiva(data);
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
    return this.config?.colorPrimario || '#183f84';
  }

  get colorSecundario(): string {
    return this.config?.colorSecundario || '#2563eb';
  }

  /** Prioriza la eleccion con votacion abierta; luego resultados; luego la primera visible. */
  private _elegirActiva(data: LandingEleccion[]): LandingEleccion | null {
    if (!data?.length) return null;
    return (
      data.find((e) => e.votarDisponible) ??
      data.find((e) => e.resultadosDisponibles) ??
      data[0]
    );
  }

  private _setupCountdown(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    const fin = this.eleccion?.fechaFinVotacion;
    if (!fin) {
      this.countdown = '';
      return;
    }
    const tick = () => {
      const diff = new Date(fin).getTime() - Date.now();
      if (diff <= 0) {
        this.countdown = '00:00:00';
        this.votacionFinalizada = true;
        if (this._timer) clearInterval(this._timer);
        this._cdr.detectChanges();
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      this.countdown = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
      this._cdr.detectChanges();
    };
    tick();
    this._timer = setInterval(tick, 1000);
  }
}
