import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import {
  ActaEscrutinio,
  DetalleActaEscrutinio,
  EscrutinioResumen,
} from '../../models/escrutinio.model';
import { EscrutinioService } from '../../services/escrutinio.service';

@Component({
  selector: 'admin-escrutinio',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './escrutinio.component.html',
})
export default class EscrutinioComponent implements OnInit {
  private _electionsService = inject(ElectionsService);
  private _escrutinioService = inject(EscrutinioService);
  private _snackBar = inject(MatSnackBar);
  private _institutionalDialog = inject(InstitutionalDialogService);

  elecciones: Eleccion[] = [];
  resumen: EscrutinioResumen | null = null;
  loading = false;
  saving = false;

  selectedEleccionCtrl = new FormControl<string>('', { nonNullable: true });

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedEleccionCtrl.valueChanges.subscribe(() => this.loadResumen());
  }

  loadElecciones(): void {
    this._electionsService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.elecciones = res.data;
        if (!this.selectedEleccionCtrl.value && res.data.length) {
          this.selectedEleccionCtrl.setValue(res.data[0].id);
        }
      },
      error: () => this._notify('No se pudieron cargar las elecciones.'),
    });
  }

  loadResumen(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) {
      this.resumen = null;
      return;
    }
    this.loading = true;
    this._escrutinioService
      .resumen(eleccionId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => (this.resumen = res),
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudo cargar escrutinio.')),
      });
  }

  generarActas(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this.saving = true;
    this._escrutinioService
      .generarActas(eleccionId)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          this.resumen = res;
          this._notify('Actas generadas.');
          this.loadElecciones();
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudieron generar actas.')),
      });
  }

  cerrarActa(acta: ActaEscrutinio): void {
    this._institutionalDialog.prompt({
      title: 'Cerrar acta de escrutinio',
      message: 'Registre una observación antes de cerrar el acta.',
      inputLabel: 'Observación del acta',
      initialValue: acta.observacion ?? '',
      confirmText: 'Cerrar acta',
      icon: 'heroicons_outline:document-check',
    }).subscribe((observacion) => {
      if (observacion === null) return;
      this.saving = true;
      this._escrutinioService
        .cerrarActa(acta.id, { observacion: observacion || null })
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => {
            this._notify('Acta cerrada.');
            this.loadResumen();
          },
          error: (err) =>
            this._notify(this.errorMessage(err, 'No se pudo cerrar el acta.')),
        });
    });
  }

  aprobarActa(acta: ActaEscrutinio): void {
    this._institutionalDialog.prompt({
      title: 'Aprobar acta de escrutinio',
      message: 'Confirme la revisión del acta y agregue una observación si corresponde.',
      inputLabel: 'Observación de aprobación',
      initialValue: acta.observacion ?? '',
      confirmText: 'Aprobar acta',
      icon: 'heroicons_outline:check-badge',
    }).subscribe((observacion) => {
      if (observacion === null) return;
      this.saving = true;
      this._escrutinioService
        .aprobarActa(acta.id, { observacion: observacion || null })
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => {
            this._notify('Acta aprobada.');
            this.loadResumen();
          },
          error: (err) =>
            this._notify(this.errorMessage(err, 'No se pudo aprobar el acta.')),
        });
    });
  }

  publicarProvisionales(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.confirm({
      title: 'Publicar resultados provisionales',
      message: 'Los resultados se mostrarán al público con carácter provisional.',
      confirmText: 'Publicar provisionales',
      icon: 'heroicons_outline:chart-bar-square',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.saving = true;
      this._escrutinioService
        .publicarProvisionales(eleccionId)
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: (res) => {
            this.resumen = res;
            this._notify('Resultados provisionales publicados.');
            this.loadElecciones();
          },
          error: (err) =>
            this._notify(
              this.errorMessage(err, 'No se pudieron publicar provisionales.'),
            ),
        });
    });
  }

  publicarDefinitivos(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    this._institutionalDialog.confirm({
      title: 'Publicar resultados definitivos',
      message: 'Los resultados quedarán visibles como información oficial del proceso electoral.',
      confirmText: 'Publicar definitivos',
      icon: 'heroicons_outline:check-circle',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.saving = true;
      this._escrutinioService
        .publicarDefinitivos(eleccionId)
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: (res) => {
            this.resumen = res;
            this._notify('Resultados definitivos publicados.');
            this.loadElecciones();
          },
          error: (err) =>
            this._notify(
              this.errorMessage(err, 'No se pudieron publicar definitivos.'),
            ),
        });
    });
  }

  opcionLabel(detalle: DetalleActaEscrutinio): string {
    if (detalle.tipo === 'BLANCO') return 'Voto blanco';
    if (detalle.tipo === 'NULO') return 'Voto nulo';
    const elector = detalle.candidatura?.elector;
    const lista = detalle.candidatura?.lista;
    return `${elector?.apellidos ?? ''} ${elector?.nombres ?? ''}${
      lista ? ` - ${lista.codigo} ${lista.nombre}` : ''
    }`;
  }

  porcentaje(total: number, base: number): number {
    if (!base) return 0;
    return Math.round((total / base) * 100);
  }

  label(value: string | null | undefined): string {
    if (!value) return '-';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
