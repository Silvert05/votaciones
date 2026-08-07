import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import {
  Dignidad,
  Eleccion,
  EleccionDetalle,
  TIPOS_ELECTOR,
  TipoElector,
} from '../../models/election.model';
import { ElectionsService } from '../../services/elections.service';

@Component({
  selector: 'admin-election-positions',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
  templateUrl: './election-positions.component.html',
})
export default class ElectionPositionsComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = [
    'orden',
    'nombre',
    'elector',
    'ganadores',
    'lista',
    'estado',
    'acciones',
  ];
  readonly tiposElector = TIPOS_ELECTOR;

  elecciones: Eleccion[] = [];
  selected: EleccionDetalle | null = null;
  selectedDignidad: Dignidad | null = null;
  selectedIdCtrl = new FormControl<string>('');
  loading = false;
  saving = false;

  form = this._fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    descripcion: [''],
    tipoElectorPermitido: ['AMBOS' as TipoElector, Validators.required],
    cantidadGanadores: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
    requiereLista: [true],
    orden: [0, [Validators.required, Validators.min(0), Validators.max(9999)]],
  });

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedIdCtrl.valueChanges.subscribe((id) => {
      if (id) {
        this.loadDetalle(id);
      } else {
        this.selected = null;
        this.newDignidad();
      }
    });
  }

  loadElecciones(): void {
    this.loading = true;
    this._electionsService
      .list({ page: 1, limit: 100 })
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.elecciones = res.data;
          if (!this.selectedIdCtrl.value && res.data.length) {
            this.selectedIdCtrl.setValue(res.data[0].id);
          }
        },
        error: () => this._notifyError('No se pudieron cargar las elecciones.'),
      });
  }

  loadDetalle(id: string): void {
    this.loading = true;
    this._electionsService
      .get(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (detalle) => {
          this.selected = detalle;
          this.newDignidad();
        },
        error: () => this._notifyError('No se pudieron cargar las dignidades.'),
      });
  }

  newDignidad(): void {
    this.selectedDignidad = null;
    this.form.reset({
      nombre: '',
      descripcion: '',
      tipoElectorPermitido: 'AMBOS',
      cantidadGanadores: 1,
      requiereLista: true,
      orden: 0,
    });
  }

  edit(dignidad: Dignidad): void {
    this.selectedDignidad = dignidad;
    this.form.reset({
      nombre: dignidad.nombre,
      descripcion: dignidad.descripcion ?? '',
      tipoElectorPermitido: dignidad.tipoElectorPermitido,
      cantidadGanadores: dignidad.cantidadGanadores,
      requiereLista: dignidad.requiereLista,
      orden: dignidad.orden,
    });
  }

  save(): void {
    if (!this.selected) {
      this._notify('Selecciona una eleccion.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre!,
      descripcion: raw.descripcion || null,
      tipoElectorPermitido: raw.tipoElectorPermitido!,
      cantidadGanadores: Number(raw.cantidadGanadores ?? 1),
      requiereLista: !!raw.requiereLista,
      orden: Number(raw.orden ?? 0),
    };

    this.saving = true;
    const request$ = this.selectedDignidad
      ? this._electionsService.updateDignidad(
          this.selected.id,
          this.selectedDignidad.id,
          payload,
        )
      : this._electionsService.createDignidad(this.selected.id, payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this._notify(this.selectedDignidad ? 'Dignidad actualizada.' : 'Dignidad creada.');
        this.loadDetalle(this.selected!.id);
      },
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo guardar.')),
    });
  }

  toggleActivo(dignidad: Dignidad): void {
    if (!this.selected) {
      return;
    }

    const request$ = dignidad.activo
      ? this._electionsService.desactivarDignidad(this.selected.id, dignidad.id)
      : this._electionsService.updateDignidad(this.selected.id, dignidad.id, {
          activo: true,
        });

    request$.subscribe({
      next: () => {
        this._notify(`Dignidad ${dignidad.activo ? 'desactivada' : 'activada'}.`);
        this.loadDetalle(this.selected!.id);
      },
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo cambiar el estado.')),
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
