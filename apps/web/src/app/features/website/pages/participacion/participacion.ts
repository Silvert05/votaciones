import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  ApexChart,
  ApexFill,
  ApexPlotOptions,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { ParticipacionPublica, VenpService } from '../../services/venp.service';
import { PublicThemeService } from '../../services/public-theme.service';

@Component({
  selector: 'app-participacion',
  imports: [DecimalPipe, MatIconModule, NgApexchartsModule],
  templateUrl: './participacion.html',
})
export default class ParticipacionComponent implements OnInit, OnDestroy {
  private _venp = inject(VenpService);
  private _cdr = inject(ChangeDetectorRef);
  private _theme = inject(PublicThemeService);
  private _sub?: Subscription;

  cargando = true;
  data: ParticipacionPublica | null = null;

  // ---- Radial gauge (ApexCharts) ----
  radialSeries: number[] = [0];
  radialChart: ApexChart = { type: 'radialBar', height: 300, fontFamily: 'inherit' };
  radialColors = ['#1d4ed8'];
  radialLabels = ['Participación'];
  radialPlot: ApexPlotOptions = {
    radialBar: {
      hollow: { size: '62%' },
      track: { background: '#e2e8f0' },
      dataLabels: {
        name: { fontSize: '14px', color: '#64748b', offsetY: 20 },
        value: {
          fontSize: '34px',
          fontWeight: 800,
          color: '#1e293b',
          offsetY: -14,
          formatter: (v: number) => `${Number(v).toFixed(2)}%`,
        },
      },
    },
  };
  radialFill: ApexFill = {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'horizontal',
      gradientToColors: ['#0ea5e9'],
      stops: [0, 100],
    },
  };

  ngOnInit(): void {
    this._venp.listElecciones().subscribe({
      next: (elecciones) => {
        const activa =
          elecciones.find((e) => e.votarDisponible) ??
          elecciones.find((e) => e.resultadosDisponibles) ??
          elecciones[0];
        if (!activa) {
          this.cargando = false;
          this._cdr.detectChanges();
          return;
        }
        this._theme.apply(activa.configuracion);
        const theme = this._theme.theme();
        this.radialColors = [theme.colorPrimario];
        this.radialFill = {
          ...this.radialFill,
          gradient: {
            ...this.radialFill.gradient,
            gradientToColors: [theme.colorSecundario],
          },
        };
        this._sub = interval(15000)
          .pipe(
            startWith(0),
            switchMap(() => this._venp.participacion(activa.id)),
          )
          .subscribe({
            next: (d) => {
              this.data = d;
              this.radialSeries = [d.porcentaje];
              this.cargando = false;
              this._cdr.detectChanges();
            },
            error: () => {
              this.cargando = false;
              this._cdr.detectChanges();
            },
          });
      },
      error: () => {
        this.cargando = false;
        this._cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  pctDignidad(total: number): number {
    const p = this.data?.padronHabilitado ?? 0;
    return p ? (total / p) * 100 : 0;
  }
}
