import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { InstitutionalDialogService } from 'app/shared/services/institutional-dialog.service';
import { DateTimePickerComponent } from 'app/shared/components/date-time-picker/date-time-picker.component';
import {
  ESTADOS_ELECCION,
  ESTADO_TRANSICIONES,
  EstadoEleccion,
  Eleccion,
  EleccionDetalle,
  EleccionesQuery,
  TipoEleccion,
} from '../../models/election.model';
import { ElectionsService } from '../../services/elections.service';

@Component({
  selector: 'admin-elections-list',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
    DateTimePickerComponent,
  ],
  templateUrl: './elections-list.component.html',
})
export default class ElectionsListComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _notifyService = inject(NotifyService);
  private _institutionalDialog = inject(InstitutionalDialogService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  readonly columns = [
    'nombre',
    'tipo',
    'estado',
    'convocatoria',
    'dignidades',
    'acciones',
  ];
  readonly estados = ESTADOS_ELECCION;

  elecciones: Eleccion[] = [];
  selected: EleccionDetalle | null = null;
  total = 0;
  loading = false;
  saving = false;

  searchCtrl = new FormControl('');
  estadoCtrl = new FormControl<EstadoEleccion | ''>('');

  form = this._fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(180)]],
    descripcion: [''],
    tipo: ['INSTITUCIONAL' as TipoEleccion, Validators.required],
    fechaConvocatoria: [''],
    vueltaActual: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
  });

  private _query: EleccionesQuery = { page: 1, limit: 10 };

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this._query.page = 1;
        this.load();
      });
    this.load();
  }

  load(): void {
    this.loading = true;
    this._query.search = this.searchCtrl.value || undefined;
    this._query.estado =
      (this.estadoCtrl.value as EstadoEleccion) || undefined;

    this._electionsService
      .list(this._query)
      .pipe(
        finalize(() => {
          this.loading = false;
          this._changeDetectorRef.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.elecciones = res.data;
          this.total = res.total;
        },
        error: () => this._notifyError('No se pudieron cargar las elecciones.'),
      });
  }

  onFilterChange(): void {
    this._query.page = 1;
    this.load();
  }

  onPage(e: PageEvent): void {
    this._query.page = e.pageIndex + 1;
    this._query.limit = e.pageSize;
    this.load();
  }

  get pageIndex(): number {
    return (this._query.page ?? 1) - 1;
  }

  get pageSize(): number {
    return this._query.limit ?? 10;
  }

  newEleccion(): void {
    this.selected = null;
    this.form.reset({
      nombre: '',
      descripcion: '',
      tipo: 'INSTITUCIONAL',
      fechaConvocatoria: '',
      vueltaActual: 1,
    });
  }

  select(eleccion: Eleccion): void {
    this._electionsService.get(eleccion.id).subscribe({
      next: (detalle) => {
        this.selected = detalle;
        this.form.reset({
          nombre: detalle.nombre,
          descripcion: detalle.descripcion ?? '',
          tipo: detalle.tipo,
          fechaConvocatoria: this.toLocalDateTime(detalle.fechaConvocatoria),
          vueltaActual: detalle.vueltaActual,
        });
      },
      error: () => this._notifyError('No se pudo cargar la eleccion.'),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre!,
      descripcion: raw.descripcion || null,
      tipo: raw.tipo!,
      fechaConvocatoria: this.toIsoDateTime(raw.fechaConvocatoria),
      ...(this.selected
        ? { vueltaActual: Number(raw.vueltaActual ?? 1) }
        : {}),
    };

    const isEdit = !!this.selected;
    this.saving = true;
    const request$ = this.selected
      ? this._electionsService.update(this.selected.id, payload)
      : this._electionsService.create(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (detalle) => {
        this.selected = detalle;
        this._notify(isEdit ? 'Eleccion guardada.' : 'Eleccion creada.');
        this.load();
      },
      error: (err) =>
        this._notifyError(this.errorMessage(err, 'No se pudo guardar.')),
    });
  }

  nextStates(eleccion: Eleccion): EstadoEleccion[] {
    return ESTADO_TRANSICIONES[eleccion.estado] ?? [];
  }

  cambiarEstado(eleccion: Eleccion, estado: EstadoEleccion): void {
    this._institutionalDialog.prompt({
      title: 'Cambiar etapa de la elección',
      message: `La elección pasará de ${this.label(eleccion.estado)} a ${this.label(estado)}.`,
      inputLabel: 'Comentario del cambio',
      confirmText: 'Cambiar etapa',
      icon: 'lucide:refresh-ccw-dot',
    }).subscribe((comentario) => {
      if (comentario === null) return;
      this._electionsService
        .cambiarEstado(eleccion.id, { estado, comentario: comentario || null })
        .subscribe({
          next: (detalle) => {
            if (this.selected?.id === detalle.id) this.selected = detalle;
            this._notify(`Estado actualizado a ${this.label(detalle.estado)}.`);
            this.load();
          },
          error: (err) =>
            this._notifyError(this.errorMessage(err, 'No se pudo cambiar el estado.')),
        });
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

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  }

  estadoClass(estado: EstadoEleccion): string {
    const base = 'inline-flex rounded px-2 py-1 text-xs font-semibold';
    if (estado === 'ANULADA') return `${base} bg-red-100 text-red-700`;
    if (estado === 'POSESIONADA') return `${base} bg-green-100 text-green-700`;
    if (estado.includes('VOTACION')) {
      return `${base} bg-blue-100 text-blue-700`;
    }
    if (estado.includes('RESULTADOS')) {
      return `${base} bg-amber-100 text-amber-700`;
    }
    return `${base} bg-slate-100 text-slate-700`;
  }

  private toIsoDateTime(value?: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toLocalDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
