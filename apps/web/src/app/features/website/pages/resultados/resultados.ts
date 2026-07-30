import { DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
    ApexAxisChartSeries,
    ApexChart,
    ApexDataLabels,
    ApexFill,
    ApexGrid,
    ApexLegend,
    ApexPlotOptions,
    ApexTooltip,
    ApexXAxis,
    ApexYAxis,
    NgApexchartsModule,
} from 'ng-apexcharts';
import { finalize } from 'rxjs';
import {
    LandingEleccion,
    ResultadosPublicos,
    VenpService,
} from '../../services/venp.service';
import { PublicThemeService } from '../../services/public-theme.service';

interface FilaResultado {
    etiqueta: string;
    detalle: string;
    color: string;
    fotoUrl: string | null;
    total: number;
    porcentaje: number;
}

@Component({
    selector: 'app-resultados',
    imports: [
        ReactiveFormsModule,
        DatePipe,
        DecimalPipe,
        UpperCasePipe,
        MatIconModule,
        NgApexchartsModule,
    ],
    templateUrl: './resultados.html',
})
export default class ResultadosComponent implements OnInit {
    private _venp = inject(VenpService);
    private _cdr = inject(ChangeDetectorRef);
    private _theme = inject(PublicThemeService);

    elecciones: LandingEleccion[] = [];
    resultados: ResultadosPublicos | null = null;
    loading = false;
    consultadoAt = new Date();

    eleccionCtrl = new FormControl<string>('', { nonNullable: true });
    dignidadCtrl = new FormControl<string>('', { nonNullable: true });

    // ---- ApexCharts ----
    series: ApexAxisChartSeries = [];
    chart: ApexChart = {
        type: 'bar',
        height: 380,
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: true, speed: 500 },
    };
    colors: string[] = [];
    plotOptions: ApexPlotOptions = {
        bar: {
            distributed: true,
            borderRadius: 8,
            borderRadiusApplication: 'end',
            columnWidth: '55%',
            dataLabels: { position: 'top' },
        },
    };
    dataLabels: ApexDataLabels = { enabled: false };
    xaxis: ApexXAxis = { categories: [] };
    yaxis: ApexYAxis = {
        labels: { formatter: (v: number) => `${Math.round(v)}` },
    };
    grid: ApexGrid = { borderColor: '#e2e8f0', strokeDashArray: 4 };
    legend: ApexLegend = { show: false };
    fill: ApexFill = { opacity: 1 };
    tooltip: ApexTooltip = {
        y: { formatter: (v: number) => `${v} voto(s)` },
    };

    ngOnInit(): void {
        this._venp.listElecciones().subscribe({
            next: (data) => {
                this.elecciones = data.filter((e) => e.resultadosDisponibles);
                if (this.elecciones.length)
                    this.eleccionCtrl.setValue(this.elecciones[0].id);
                this._cdr.detectChanges();
            },
        });
        this.eleccionCtrl.valueChanges.subscribe((id) => id && this.cargar(id));
        this.dignidadCtrl.valueChanges.subscribe(() => {
            this._buildChart();
            this._cdr.detectChanges();
        });
    }

    cargar(eleccionId: string): void {
        this._theme.apply(
            this.elecciones.find((eleccion) => eleccion.id === eleccionId)
                ?.configuracion
        );
        this.loading = true;
        this._venp
            .resultados(eleccionId)
            .pipe(
                finalize(() => {
                    this.loading = false;
                    this._cdr.detectChanges();
                })
            )
            .subscribe({
                next: (res) => {
                    this.resultados = res;
                    this.consultadoAt = new Date();
                    if (res.dignidades.length)
                        this.dignidadCtrl.setValue(res.dignidades[0].id);
                    this._buildChart();
                },
                error: () => (this.resultados = null),
            });
    }

    get dignidadSel() {
        return this.resultados?.dignidades.find(
            (d) => d.id === this.dignidadCtrl.value
        );
    }

    get emitidosDignidad(): number {
        return (
            this.resultados?.emitidos.find(
                (e) => e.dignidadId === this.dignidadCtrl.value
            )?.total ?? 0
        );
    }

    get porcentajeParticipacion(): number {
        const padron = this.resultados?.padronHabilitado ?? 0;
        if (!padron) return 0;
        return (this.emitidosDignidad / padron) * 100;
    }

    get filas(): FilaResultado[] {
        if (!this.resultados) return [];
        const conteos = this.resultados.conteos.filter(
            (c) => c.dignidadId === this.dignidadCtrl.value
        );
        const total = conteos.reduce((acc, c) => acc + c.total, 0) || 1;
        return conteos
            .map((c) => {
                let etiqueta = 'Voto en blanco';
                let detalle = '';
                let color = '#94a3b8';
                let fotoUrl: string | null = null;
                if (c.tipo === 'NULO') {
                    etiqueta = 'Voto nulo';
                    color = '#64748b';
                } else if (c.candidatura) {
                    etiqueta = `${c.candidatura.elector.apellidos} ${c.candidatura.elector.nombres}`;
                    detalle = c.candidatura.lista
                        ? `${c.candidatura.lista.codigo} · ${c.candidatura.lista.nombre}`
                        : '';
                    color = c.candidatura.lista?.color || this._theme.theme().colorPrimario;
                    fotoUrl =
                        c.candidatura.elector.fotoUrl ||
                        '/img/avatar-placeholder.svg';
                }
                return {
                    etiqueta,
                    detalle,
                    color,
                    fotoUrl,
                    total: c.total,
                    porcentaje: (c.total / total) * 100,
                };
            })
            .sort((a, b) => b.total - a.total);
    }

    filasCarrera(
        carrera: ResultadosPublicos['estadisticasCarrera'][number]
    ): FilaResultado[] {
        const opciones = carrera.opciones.filter(
            (opcion) => opcion.dignidadId === this.dignidadCtrl.value
        );
        const total = opciones.reduce((acc, opcion) => acc + opcion.total, 0) || 1;
        return opciones
            .map((opcion) => {
                let etiqueta = 'Voto en blanco';
                let detalle = '';
                let color = '#94a3b8';
                let fotoUrl: string | null = null;
                if (opcion.tipo === 'NULO') {
                    etiqueta = 'Voto nulo';
                    color = '#64748b';
                } else if (opcion.candidatura) {
                    etiqueta = `${opcion.candidatura.elector.apellidos} ${opcion.candidatura.elector.nombres}`;
                    detalle = opcion.candidatura.lista
                        ? `${opcion.candidatura.lista.codigo} · ${opcion.candidatura.lista.nombre}`
                        : '';
                    color =
                        opcion.candidatura.lista?.color ||
                        this._theme.theme().colorPrimario;
                    fotoUrl =
                        opcion.candidatura.elector.fotoUrl ||
                        '/img/avatar-placeholder.svg';
                }
                return {
                    etiqueta,
                    detalle,
                    color,
                    fotoUrl,
                    total: opcion.total,
                    porcentaje: (opcion.total / total) * 100,
                };
            })
            .sort((a, b) => b.total - a.total);
    }

    private _buildChart(): void {
        const filas = this.filas;
        const total = filas.reduce((acc, f) => acc + f.total, 0) || 1;
        this.series = [{ name: 'Votos', data: filas.map((f) => f.total) }];
        this.colors = filas.map((f) => f.color);
        this.xaxis = {
            categories: filas.map((f) => f.etiqueta),
            labels: {
                style: { fontSize: '12px', fontWeight: 600, colors: '#475569' },
                trim: true,
                hideOverlappingLabels: false,
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        };
        this.dataLabels = {
            enabled: true,
            offsetY: -24,
            formatter: (val: number) =>
                total ? `${((val / total) * 100).toFixed(2)}%` : '0%',
            style: { fontSize: '13px', fontWeight: 800, colors: ['#1e293b'] },
        };
    }

    imprimir(): void {
        window.print();
    }

    exportarPdf(): void {
        // El diálogo de impresión del navegador permite "Guardar como PDF".
        window.print();
    }
}
