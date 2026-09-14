import { DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
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
import { Subscription, finalize, interval, startWith, switchMap } from 'rxjs';
import {
    LandingEleccion,
    ResultadosPublicos,
    VenpService,
} from '../../services/venp.service';
import { PublicThemeService } from '../../services/public-theme.service';

/** Refresca la lista de elecciones para reflejar publicar/ocultar del admin sin recargar. */
const REFRESCO_MS = 20000;

type DignidadResultado = ResultadosPublicos['dignidades'][number];

interface FilaResultado {
    etiqueta: string;
    detalle: string;
    color: string;
    fotoUrl: string | null;
    total: number;
    porcentaje: number;
}

interface AutoridadElecta {
    dignidad: string;
    nombre: string;
    fotoUrl: string | null;
    listaCodigo: string | null;
    listaNombre: string | null;
    listaColor: string | null;
}

interface ChartData {
    series: ApexAxisChartSeries;
    colors: string[];
    xaxis: ApexXAxis;
    dataLabels: ApexDataLabels;
}

const CHART_VACIO: ChartData = {
    series: [{ name: 'Votos', data: [] }],
    colors: [],
    xaxis: { categories: [] },
    dataLabels: { enabled: false },
};

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
export default class ResultadosComponent implements OnInit, OnDestroy {
    private _venp = inject(VenpService);
    private _cdr = inject(ChangeDetectorRef);
    private _theme = inject(PublicThemeService);
    private _sub?: Subscription;

    elecciones: LandingEleccion[] = [];
    resultados: ResultadosPublicos | null = null;
    loading = false;
    consultadoAt = new Date();

    eleccionCtrl = new FormControl<string>('', { nonNullable: true });
    /** Solo dignidades individuales (sin plancha): las de plancha comparten un único resultado. */
    dignidadCtrl = new FormControl<string>('', { nonNullable: true });

    // ---- ApexCharts: config compartida por ambos gráficos ----
    chart: ApexChart = {
        type: 'bar',
        height: 380,
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: true, speed: 500 },
    };
    plotOptions: ApexPlotOptions = {
        bar: {
            distributed: true,
            borderRadius: 8,
            borderRadiusApplication: 'end',
            columnWidth: '55%',
            dataLabels: { position: 'top' },
        },
    };
    yaxis: ApexYAxis = {
        labels: { formatter: (v: number) => `${Math.round(v)}` },
    };
    grid: ApexGrid = { borderColor: '#e2e8f0', strokeDashArray: 4 };
    legend: ApexLegend = { show: false };
    fill: ApexFill = { opacity: 1 };
    tooltip: ApexTooltip = {
        y: { formatter: (v: number) => `${v} voto(s)` },
    };

    // ---- Config específica: plancha (siempre el mismo resultado en todas sus dignidades) vs individual ----
    chartPlancha: ChartData = CHART_VACIO;
    chartIndividual: ChartData = CHART_VACIO;

    ngOnInit(): void {
        this._sub = interval(REFRESCO_MS)
            .pipe(
                startWith(0),
                switchMap(() => this._venp.listElecciones()),
            )
            .subscribe({
                next: (data) => {
                    this.elecciones = data.filter((e) => e.resultadosDisponibles);
                    const sigueDisponible = this.elecciones.some(
                        (e) => e.id === this.eleccionCtrl.value,
                    );
                    if (!sigueDisponible) {
                        this.resultados = null;
                        this.eleccionCtrl.setValue(this.elecciones[0]?.id ?? '');
                    }
                    this._cdr.detectChanges();
                },
                error: () => this._cdr.detectChanges(),
            });
        this.eleccionCtrl.valueChanges.subscribe((id) => id && this.cargar(id));
        this.dignidadCtrl.valueChanges.subscribe(() => {
            this._actualizarCharts();
            this._cdr.detectChanges();
        });
    }

    ngOnDestroy(): void {
        this._sub?.unsubscribe();
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
                    const individuales = res.dignidades.filter((d) => !d.requiereLista);
                    this.dignidadCtrl.setValue(individuales[0]?.id ?? '');
                    this._actualizarCharts();
                },
                error: () => (this.resultados = null),
            });
    }

    /** Dignidades que se votan en plancha (Art. 16): una sola lista para todas. */
    get dignidadesPlancha(): DignidadResultado[] {
        return this.resultados?.dignidades.filter((d) => d.requiereLista) ?? [];
    }

    /** Dignidades que se votan por candidato individual: cada una puede tener un resultado distinto. */
    get dignidadesIndividuales(): DignidadResultado[] {
        return this.resultados?.dignidades.filter((d) => !d.requiereLista) ?? [];
    }

    /**
     * Todas las dignidades de plancha comparten exactamente el mismo resultado
     * (Art. 16), así que basta una como referencia para mostrarlo una sola vez.
     */
    get dignidadPlanchaRef(): DignidadResultado | null {
        return this.dignidadesPlancha[0] ?? null;
    }

    get dignidadSel(): DignidadResultado | null {
        return (
            this.resultados?.dignidades.find((d) => d.id === this.dignidadCtrl.value) ?? null
        );
    }

    /** Dignidad usada para el desglose "por carrera": la individual elegida, o la plancha si no hay individuales. */
    get dignidadCarreraRef(): DignidadResultado | null {
        return this.dignidadSel ?? this.dignidadPlanchaRef;
    }

    emitidosDe(dignidadId: string | null | undefined): number {
        if (!dignidadId) return 0;
        return (
            this.resultados?.emitidos.find((e) => e.dignidadId === dignidadId)?.total ?? 0
        );
    }

    porcentajeDe(dignidadId: string | null | undefined): number {
        const padron = this.resultados?.padronHabilitado ?? 0;
        if (!padron) return 0;
        return (this.emitidosDe(dignidadId) / padron) * 100;
    }

    /**
     * Lista ganadora de la plancha (Art. 16): el mayor votado entre las
     * candidaturas afiliadas a una lista. `null` mientras no haya votos reales
     * (para no declarar un "ganador" con 0 votos) o una vez posesionada la
     * elección, porque en ese punto ya se muestra el acta formal (ver
     * `autoridadesElectas`).
     */
    get listaLiderPlancha(): FilaResultado | null {
        if (!this.dignidadPlanchaRef || this.posesionada) return null;
        const lider = this.filasPlancha.find((f) => f.detalle);
        return lider && lider.total > 0 ? lider : null;
    }

    /** Art. 22: una vez posesionadas las autoridades, el resultado ya es oficial y definitivo. */
    get posesionada(): boolean {
        return this.resultados?.eleccion.estado === 'POSESIONADA';
    }

    /** Autoridad con mas votos en cada dignidad, para el acta de posesion (Art. 22). */
    get autoridadesElectas(): AutoridadElecta[] {
        if (!this.resultados) return [];
        return this.resultados.dignidades
            .map((d) => {
                const ganador = this.resultados!.conteos
                    .filter((c) => c.dignidadId === d.id && c.tipo === 'CANDIDATO')
                    .sort((a, b) => b.total - a.total)[0];
                if (!ganador?.candidatura) return null;
                return {
                    dignidad: d.nombre,
                    nombre: `${ganador.candidatura.elector.apellidos} ${ganador.candidatura.elector.nombres}`,
                    fotoUrl: ganador.candidatura.elector.fotoUrl,
                    listaCodigo: ganador.candidatura.lista?.codigo ?? null,
                    listaNombre: ganador.candidatura.lista?.nombre ?? null,
                    listaColor: ganador.candidatura.lista?.color ?? null,
                } satisfies AutoridadElecta;
            })
            .filter((a): a is AutoridadElecta => a !== null);
    }

    get filasPlancha(): FilaResultado[] {
        return this.filasDe(this.dignidadPlanchaRef?.id);
    }

    get filasIndividual(): FilaResultado[] {
        return this.filasDe(this.dignidadSel?.id);
    }

    /**
     * Desglose completo de una dignidad: el universo de candidaturas
     * calificadas (aunque no hayan recibido ningún voto) más blanco y nulo,
     * para que una lista que perdió con 0 votos también se vea reflejada en
     * vez de simplemente desaparecer del resultado.
     */
    filasDe(dignidadId: string | null | undefined): FilaResultado[] {
        if (!this.resultados || !dignidadId) return [];
        const dignidad = this.resultados.dignidades.find((d) => d.id === dignidadId);
        if (!dignidad) return [];

        const conteosPorCandidatura = new Map(
            this.resultados.conteos
                .filter((c) => c.dignidadId === dignidadId && c.tipo === 'CANDIDATO')
                .map((c) => [c.candidaturaId, c.total] as const),
        );
        const totalBlanco =
            this.resultados.conteos.find((c) => c.dignidadId === dignidadId && c.tipo === 'BLANCO')
                ?.total ?? 0;
        const totalNulo =
            this.resultados.conteos.find((c) => c.dignidadId === dignidadId && c.tipo === 'NULO')
                ?.total ?? 0;

        const sinPorcentaje = [
            ...dignidad.candidaturas.map((c) => ({
                etiqueta: `${c.elector.apellidos} ${c.elector.nombres}`,
                detalle: c.lista ? `${c.lista.codigo} · ${c.lista.nombre}` : '',
                color: c.lista?.color || this._theme.theme().colorPrimario,
                fotoUrl: c.elector.fotoUrl || '/img/avatar-placeholder.svg',
                total: conteosPorCandidatura.get(c.id) ?? 0,
            })),
            { etiqueta: 'Voto en blanco', detalle: '', color: '#94a3b8', fotoUrl: null, total: totalBlanco },
            { etiqueta: 'Voto nulo', detalle: '', color: '#64748b', fotoUrl: null, total: totalNulo },
        ];

        const total = sinPorcentaje.reduce((acc, f) => acc + f.total, 0) || 1;
        return sinPorcentaje
            .map((f) => ({ ...f, porcentaje: (f.total / total) * 100 }))
            .sort((a, b) => b.total - a.total);
    }

    filasCarrera(
        carrera: ResultadosPublicos['estadisticasCarrera'][number]
    ): FilaResultado[] {
        const opciones = carrera.opciones.filter(
            (opcion) => opcion.dignidadId === this.dignidadCarreraRef?.id
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

    private _actualizarCharts(): void {
        this.chartPlancha = this._construirChart(this.filasPlancha);
        this.chartIndividual = this._construirChart(this.filasIndividual);
    }

    private _construirChart(filas: FilaResultado[]): ChartData {
        const total = filas.reduce((acc, f) => acc + f.total, 0) || 1;
        return {
            series: [{ name: 'Votos', data: filas.map((f) => f.total) }],
            colors: filas.map((f) => f.color),
            xaxis: {
                categories: filas.map((f) => f.etiqueta),
                labels: {
                    style: { fontSize: '12px', fontWeight: 600, colors: '#475569' },
                    trim: true,
                    hideOverlappingLabels: false,
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            dataLabels: {
                enabled: true,
                offsetY: -24,
                formatter: (val: number) =>
                    total ? `${((val / total) * 100).toFixed(2)}%` : '0%',
                style: { fontSize: '13px', fontWeight: 800, colors: ['#1e293b'] },
            },
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
