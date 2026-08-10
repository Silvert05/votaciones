import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { NotifyService } from 'app/shared/services/notify.service';
import { finalize } from 'rxjs';
import { DateTimePickerComponent } from 'app/shared/components/date-time-picker/date-time-picker.component';
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
  { field: 'fechaConvocatoria', label: 'Convocatoria del proceso', icon: 'lucide:megaphone' },
  { field: 'fechaPublicacionPadron', label: 'Publicacion del padron', icon: 'lucide:users' },
  { field: 'fechaInicioInscripcion', label: 'Apertura de candidaturas', icon: 'lucide:user-plus' },
  { field: 'fechaFinInscripcion', label: 'Cierre de candidaturas', icon: 'lucide:users-round' },
  { field: 'fechaInicioVotacion', label: 'Inicio de la votacion', icon: 'lucide:mouse-pointer-click' },
  { field: 'fechaFinVotacion', label: 'Cierre de la votacion', icon: 'lucide:lock' },
  { field: 'fechaPublicacionResultados', label: 'Publicacion de resultados', icon: 'lucide:chart-bar' },
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
    DateTimePickerComponent,
  ],
  templateUrl: './election-schedule.component.html',
})
export default class ElectionScheduleComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _notifyService = inject(NotifyService);
  private _changeDetectorRef = inject(ChangeDetectorRef);

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
          this.patchCronograma(detalle.cronograma);
        },
        error: () => this._notifyError('No se pudo cargar el cronograma.'),
      });
  }

  save(): void {
    if (!this.selected) {
      this._notifyService.warning('Selecciona una eleccion.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this._notifyService.warning('Indica el inicio y el cierre de la votacion.');
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.fechaInicioVotacion && raw.fechaFinVotacion &&
        new Date(raw.fechaInicioVotacion) >= new Date(raw.fechaFinVotacion)) {
      this._notifyService.warning('El cierre de la votacion debe ser posterior al inicio.');
      return;
    }
    if (
      raw.fechaFinVotacion &&
      raw.fechaPublicacionResultados &&
      new Date(raw.fechaFinVotacion) > new Date(raw.fechaPublicacionResultados)
    ) {
      this._notifyService.warning(
        'La publicacion de resultados debe ser posterior al cierre de la votacion.',
      );
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
          this._notifyError(this.errorMessage(err, 'No se pudo guardar.')),
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
