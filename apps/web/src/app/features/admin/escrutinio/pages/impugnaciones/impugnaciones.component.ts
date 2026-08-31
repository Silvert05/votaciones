import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
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
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _institutionalDialog = inject(InstitutionalDialogService);

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
  respaldoCtrl = new FormControl('', [Validators.required]);

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
      error: () => this._notifyError('No se pudieron cargar las elecciones.'),
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
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => (this.resumen = res),
        error: (err) =>
          this._notifyError(
            this.errorMessage(err, 'No se pudieron cargar impugnaciones.'),
          ),
      });
  }

  crear(): void {
    const eleccionId = this.selectedEleccionCtrl.value;
    if (!eleccionId) return;
    const respaldoIdentificaciones = this.parseRespaldo();
    if (
      this.presentadoPorCtrl.invalid ||
      this.fundamentoCtrl.invalid ||
      !respaldoIdentificaciones.length
    ) {
      this.presentadoPorCtrl.markAsTouched();
      this.fundamentoCtrl.markAsTouched();
      this.respaldoCtrl.markAsTouched();
      return;
    }

    this.saving = true;
    this._escrutinioService
      .crearImpugnacion(eleccionId, {
        dignidadId: this.dignidadCtrl.value || null,
        presentadoPor: this.presentadoPorCtrl.value?.trim() ?? '',
        fundamento: this.fundamentoCtrl.value?.trim() ?? '',
        respaldoIdentificaciones,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this._notify('Impugnación registrada.');
          this.presentadoPorCtrl.reset('');
          this.fundamentoCtrl.reset('');
          this.respaldoCtrl.reset('');
          this.loadResumen();
          this.loadElecciones();
        },
        error: (err) =>
          this._notifyError(
            this.errorMessage(err, 'No se pudo registrar la impugnación.'),
          ),
      });
  }

  resolver(
    impugnacion: ImpugnacionResultado,
    estado: Exclude<EstadoImpugnacionResultado, 'PENDIENTE'>,
  ): void {
    this._institutionalDialog.prompt({
      title: 'Resolver impugnación',
      message: `La impugnación será marcada como ${estado.toLowerCase()}.`,
      inputLabel: 'Resolución de la impugnación',
      initialValue: impugnacion.resolucion ?? '',
      confirmText: 'Guardar resolución',
      required: true,
      icon: 'lucide:scale',
    }).subscribe((resolucion) => {
      if (!resolucion) return;
      this.saving = true;
      this._escrutinioService
        .resolverImpugnacion(impugnacion.id, { estado, resolucion })
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => {
            this._notify('Impugnación resuelta.');
            this.loadResumen();
          },
          error: (err) =>
            this._notifyError(
              this.errorMessage(err, 'No se pudo resolver la impugnación.'),
            ),
        });
    });
  }

  private parseRespaldo(): string[] {
    const raw = this.respaldoCtrl.value ?? '';
    return [
      ...new Set(
        raw
          .split(/[\s,;]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
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
    this._notifyService.success(message);
  }

  private _notifyError(message: string): void {
    this._notifyService.error(message);
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
