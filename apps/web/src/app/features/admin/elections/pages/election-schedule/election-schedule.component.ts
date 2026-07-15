import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import {
  CronogramaElectoral,
  Eleccion,
  EleccionDetalle,
  UpsertCronogramaPayload,
} from '../../models/election.model';
import { ElectionsService } from '../../services/elections.service';

const CRONOGRAMA_FIELDS: Array<keyof UpsertCronogramaPayload> = [
  'fechaConvocatoria',
  'fechaPublicacionPadron',
  'fechaInicioInscripcion',
  'fechaFinInscripcion',
  'fechaInicioVotacion',
  'fechaFinVotacion',
  'fechaPublicacionResultados',
];

const EVENTOS_PREVIEW = [
  { field: 'fechaConvocatoria', label: 'Convocatoria del proceso', icon: 'heroicons_outline:megaphone' },
  { field: 'fechaPublicacionPadron', label: 'Publicacion del padron', icon: 'heroicons_outline:users' },
  { field: 'fechaInicioInscripcion', label: 'Apertura de candidaturas', icon: 'heroicons_outline:user-plus' },
  { field: 'fechaFinInscripcion', label: 'Cierre de candidaturas', icon: 'heroicons_outline:user-group' },
  { field: 'fechaInicioVotacion', label: 'Inicio de la votacion', icon: 'heroicons_outline:cursor-arrow-rays' },
  { field: 'fechaFinVotacion', label: 'Cierre de la votacion', icon: 'heroicons_outline:lock-closed' },
  { field: 'fechaPublicacionResultados', label: 'Publicacion de resultados', icon: 'heroicons_outline:chart-bar' },
] as const;

@Component({
  selector: 'admin-election-schedule',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './election-schedule.component.html',
})
export default class ElectionScheduleComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _snackBar = inject(MatSnackBar);

  elecciones: Eleccion[] = [];
  selected: EleccionDetalle | null = null;
  selectedIdCtrl = new FormControl<string>('');
  loading = false;
  saving = false;

  form = this._fb.group({
    fechaConvocatoria: [''],
    fechaPublicacionPadron: [''],
    fechaInicioInscripcion: [''],
    fechaFinInscripcion: [''],
    fechaInicioVotacion: ['', Validators.required],
    fechaFinVotacion: ['', Validators.required],
    fechaPublicacionResultados: [''],
  });

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedIdCtrl.valueChanges.subscribe((id) => {
      if (id) {
        this.loadDetalle(id);
      } else {
        this.selected = null;
        this.form.reset();
      }
    });
  }

  loadElecciones(): void {
    this.loading = true;
    this._electionsService
      .list({ page: 1, limit: 100 })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.elecciones = res.data;
          if (!this.selectedIdCtrl.value && res.data.length) {
            this.selectedIdCtrl.setValue(res.data[0].id);
          }
        },
        error: () => this._notify('No se pudieron cargar las elecciones.'),
      });
  }

  loadDetalle(id: string): void {
    this.loading = true;
    this._electionsService
      .get(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (detalle) => {
          this.selected = detalle;
          this.patchCronograma(detalle.cronograma);
        },
        error: () => this._notify('No se pudo cargar el cronograma.'),
      });
  }

  save(): void {
    if (!this.selected) {
      this._notify('Selecciona una eleccion.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this._notify('Indica el inicio y el cierre de la votacion.');
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.fechaInicioVotacion && raw.fechaFinVotacion &&
        new Date(raw.fechaInicioVotacion) >= new Date(raw.fechaFinVotacion)) {
      this._notify('El cierre de la votacion debe ser posterior al inicio.');
      return;
    }

    const payload = this.buildPayload();
    this.saving = true;
    this._electionsService
      .upsertCronograma(this.selected.id, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (cronograma) => {
          if (this.selected) {
            this.selected = { ...this.selected, cronograma };
          }
          this._notify('Cronograma guardado.');
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudo guardar.')),
      });
  }

  get previewEvents() {
    const raw = this.form.getRawValue();
    return EVENTOS_PREVIEW.map((evento) => ({
      ...evento,
      value: raw[evento.field],
      formatted: this.formatPreview(raw[evento.field]),
    }));
  }

  private formatPreview(value?: string | null): string {
    if (!value) return 'Fecha pendiente';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha pendiente';
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private patchCronograma(cronograma: CronogramaElectoral | null): void {
    const values: Record<string, string> = {};
    for (const field of CRONOGRAMA_FIELDS) {
      values[field] = this.toLocalDateTime(cronograma?.[field] ?? null);
    }
    this.form.reset(values);
  }

  private buildPayload(): UpsertCronogramaPayload {
    const raw = this.form.getRawValue();
    const payload: UpsertCronogramaPayload = {};
    for (const field of CRONOGRAMA_FIELDS) {
      payload[field] = this.toIsoDateTime(raw[field]);
    }
    return payload;
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
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
