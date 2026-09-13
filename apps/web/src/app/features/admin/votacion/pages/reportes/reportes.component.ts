import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { Observable, finalize } from 'rxjs';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import { VotacionService } from '../../services/votacion.service';

interface ReporteDisponible {
  key: string;
  titulo: string;
  descripcion: string;
  icono: string;
  archivo: string;
  descargar: (eleccionId: string) => Observable<Blob>;
}

@Component({
  selector: 'admin-reportes-votacion',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './reportes.component.html',
})
export default class ReportesComponent implements OnInit {
  private _electionsService = inject(ElectionsService);
  private _votacionService = inject(VotacionService);
  private _notifyService = inject(NotifyService);

  elecciones: Eleccion[] = [];
  selectedEleccionCtrl = new FormControl<string>('', { nonNullable: true });

  /** Clave del reporte que se esta generando ahora mismo (para el spinner de su tarjeta). */
  descargando: string | null = null;

  readonly reportes: ReporteDisponible[] = [
    {
      key: 'acta-lista',
      titulo: 'Acta por lista',
      descripcion:
        'Conteo oficial de votos agrupado por lista electoral, lista para firma y respaldo del proceso.',
      icono: 'lucide:file-chart-column',
      archivo: 'acta-por-lista.pdf',
      descargar: (eleccionId) =>
        this._votacionService.reporteActaPorLista(eleccionId),
    },
    {
      key: 'participacion',
      titulo: 'Participación docentes/estudiantes',
      descripcion:
        'Porcentaje de votantes habilitados que sufragaron, segmentado por tipo de elector.',
      icono: 'lucide:users-round',
      archivo: 'participacion-por-tipo.pdf',
      descargar: (eleccionId) =>
        this._votacionService.reporteParticipacionPorTipo(eleccionId),
    },
    {
      key: 'acta-dignidades',
      titulo: 'Acta por dignidad',
      descripcion:
        'Resultados detallados de cada dignidad en disputa, con el total de votos por candidatura.',
      icono: 'lucide:clipboard-check',
      archivo: 'acta-por-dignidades.pdf',
      descargar: (eleccionId) =>
        this._votacionService.reporteActaPorDignidades(eleccionId),
    },
  ];

  ngOnInit(): void {
    this.loadElecciones();
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

  label(value: string | null | undefined): string {
    if (!value) return '-';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  descargar(reporte: ReporteDisponible): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId || this.descargando) return;
    this.descargando = reporte.key;
    reporte
      .descargar(eleccionId)
      .pipe(finalize(() => (this.descargando = null)))
      .subscribe({
        next: (blob) => {
          this._downloadBlob(reporte.archivo, blob);
          this._notifyService.success(`Reporte generado: ${reporte.archivo}`);
        },
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
