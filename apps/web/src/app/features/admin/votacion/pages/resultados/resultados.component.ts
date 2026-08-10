import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { finalize } from 'rxjs';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import {
  ConteoVoto,
  EstadisticaCarrera,
  ResultadosResponse,
} from '../../models/votacion.model';
import { VotacionService } from '../../services/votacion.service';

@Component({
  selector: 'admin-resultados-votacion',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './resultados.component.html',
})
export default class ResultadosComponent implements OnInit {
  private _electionsService = inject(ElectionsService);
  private _votacionService = inject(VotacionService);
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  elecciones: Eleccion[] = [];
  resultados: ResultadosResponse | null = null;
  loading = false;

  selectedEleccionCtrl = new FormControl<string>('', { nonNullable: true });

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedEleccionCtrl.valueChanges.subscribe(() => this.loadResultados());
  }

  loadElecciones(): void {
    this._electionsService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.elecciones = res.data;
        if (!this.selectedEleccionCtrl.value && res.data.length) {
          this.selectedEleccionCtrl.setValue(res.data[0].id);
        }
      },
      error: () => this._notifyError('No se pudieron cargar las elecciones.'),
    });
  }

  loadResultados(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this.resultados = null;
      return;
    }
    this.loading = true;
    this._votacionService
      .resultados(eleccionId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.resultados = res;
        },
        error: (err) =>
          this._notifyError(this.errorMessage(err, 'No se pudieron cargar resultados.')),
      });
  }

  conteosPorDignidad(dignidadId: string): ConteoVoto[] {
    return (this.resultados?.conteos ?? []).filter(
      (conteo) => conteo.dignidadId === dignidadId,
    );
  }

  emitidosPorDignidad(dignidadId: string): number {
    return (
      this.resultados?.emitidos.find((item) => item.dignidadId === dignidadId)
        ?.total ?? 0
    );
  }

  get totalVotantes(): number {
    return Math.max(
      0,
      ...(this.resultados?.emitidos ?? []).map((item) => item.total),
    );
  }

  opcionesCarrera(
    carrera: EstadisticaCarrera,
    dignidadId: string,
  ): EstadisticaCarrera['opciones'] {
    return carrera.opciones.filter(
      (opcion) => opcion.dignidadId === dignidadId,
    );
  }

  opcionCarreraLabel(
    opcion: EstadisticaCarrera['opciones'][number],
  ): string {
    if (opcion.tipo === 'BLANCO') return 'Voto blanco';
    if (opcion.tipo === 'NULO') return 'Voto nulo';
    const elector = opcion.candidatura?.elector;
    const lista = opcion.candidatura?.lista;
    return `${elector?.apellidos ?? ''} ${elector?.nombres ?? ''}${
      lista ? ` - ${lista.codigo} ${lista.nombre}` : ''
    }`.trim();
  }

  opcionLabel(conteo: ConteoVoto): string {
    if (conteo.tipo === 'BLANCO') return 'Voto blanco';
    if (conteo.tipo === 'NULO') return 'Voto nulo';
    const elector = conteo.candidatura?.elector;
    const lista = conteo.candidatura?.lista;
    return `${elector?.apellidos ?? ''} ${elector?.nombres ?? ''}${
      lista ? ` - ${lista.codigo} ${lista.nombre}` : ''
    }`;
  }

  porcentaje(total: number, emitidos: number): number {
    if (!emitidos) return 0;
    return Math.round((total / emitidos) * 100);
  }

  label(value: string | null | undefined): string {
    if (!value) return '-';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  descargarActaPorLista(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._votacionService.reporteActaPorLista(eleccionId).subscribe({
      next: (blob) => this._downloadBlob('acta-por-lista.pdf', blob),
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo generar el reporte.')),
    });
  }

  descargarParticipacionPorTipo(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._votacionService.reporteParticipacionPorTipo(eleccionId).subscribe({
      next: (blob) => this._downloadBlob('participacion-por-tipo.pdf', blob),
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo generar el reporte.')),
    });
  }

  descargarActaPorDignidades(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._votacionService.reporteActaPorDignidades(eleccionId).subscribe({
      next: (blob) => this._downloadBlob('acta-por-dignidades.pdf', blob),
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo generar el reporte.')),
    });
  }

  private _downloadBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private _notifyError(message: string): void {
    this._notifyService.error(message);
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
