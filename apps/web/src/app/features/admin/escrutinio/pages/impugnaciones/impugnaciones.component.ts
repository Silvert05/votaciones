import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { Eleccion } from '../../../elections/models/election.model';
import { ElectionsService } from '../../../elections/services/elections.service';
import {
  EscrutinioResumen,
  EstadoImpugnacionResultado,
  ImpugnacionResultado,
} from '../../models/escrutinio.model';
import { EscrutinioService } from '../../services/escrutinio.service';

@Component({
  selector: 'admin-impugnaciones-resultados',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './impugnaciones.component.html',
})
export default class ImpugnacionesComponent implements OnInit {
  private _electionsService = inject(ElectionsService);
  private _escrutinioService = inject(EscrutinioService);
  private _snackBar = inject(MatSnackBar);

  elecciones: Eleccion[] = [];
  resumen: EscrutinioResumen | null = null;
  loading = false;
  saving = false;

  selectedEleccionCtrl = new FormControl<string>('', { nonNullable: true });
  dignidadCtrl = new FormControl<string>('', { nonNullable: true });
  presentadoPorCtrl = new FormControl('', [
    Validators.required,
    Validators.maxLength(160),
  ]);
  fundamentoCtrl = new FormControl('', [Validators.required]);

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedEleccionCtrl.valueChanges.subscribe(() => {
      this.dignidadCtrl.setValue('');
      this.loadResumen();
    });
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
          this._notify(
            this.errorMessage(err, 'No se pudieron cargar impugnaciones.'),
          ),
      });
  }

  crear(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    if (this.presentadoPorCtrl.invalid || this.fundamentoCtrl.invalid) {
      this.presentadoPorCtrl.markAsTouched();
      this.fundamentoCtrl.markAsTouched();
      return;
    }

    this.saving = true;
    this._escrutinioService
      .crearImpugnacion(eleccionId, {
        dignidadId: this.dignidadCtrl.value || null,
        presentadoPor: this.presentadoPorCtrl.value?.trim() ?? '',
        fundamento: this.fundamentoCtrl.value?.trim() ?? '',
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this._notify('Impugnacion registrada.');
          this.presentadoPorCtrl.reset('');
          this.fundamentoCtrl.reset('');
          this.loadResumen();
          this.loadElecciones();
        },
        error: (err) =>
          this._notify(
            this.errorMessage(err, 'No se pudo registrar la impugnacion.'),
          ),
      });
  }

  resolver(
    impugnacion: ImpugnacionResultado,
    estado: Exclude<EstadoImpugnacionResultado, 'PENDIENTE'>,
  ): void {
    const resolucion = prompt('Resolucion de la impugnacion', impugnacion.resolucion ?? '');
    if (!resolucion?.trim()) return;

    this.saving = true;
    this._escrutinioService
      .resolverImpugnacion(impugnacion.id, {
        estado,
        resolucion: resolucion.trim(),
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this._notify('Impugnacion resuelta.');
          this.loadResumen();
        },
        error: (err) =>
          this._notify(
            this.errorMessage(err, 'No se pudo resolver la impugnacion.'),
          ),
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

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
