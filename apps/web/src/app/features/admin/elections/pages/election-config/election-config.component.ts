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
  ConfiguracionEleccion,
  Eleccion,
  UpsertConfiguracionPayload,
} from '../../models/election.model';
import { ElectionsService } from '../../services/elections.service';

const CONFIG_FIELDS: Array<keyof UpsertConfiguracionPayload> = [
  'nombreInstitucion',
  'logoUrl',
  'escudoUrl',
  'colorPrimario',
  'colorSecundario',
  'colorAcento',
  'mensajeBienvenida',
];

@Component({
  selector: 'admin-election-config',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './election-config.component.html',
})
export default class ElectionConfigComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _electionsService = inject(ElectionsService);
  private _snackBar = inject(MatSnackBar);

  elecciones: Eleccion[] = [];
  selectedId: string | null = null;
  selectedIdCtrl = new FormControl<string>('');
  loading = false;
  saving = false;

  form = this._fb.group({
    nombreInstitucion: [''],
    logoUrl: [''],
    escudoUrl: [''],
    colorPrimario: ['#183f84', Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    colorSecundario: ['#ea580c', Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    colorAcento: ['#f3eadc', Validators.pattern(/^#[0-9a-fA-F]{6}$/)],
    mensajeBienvenida: [''],
  });

  ngOnInit(): void {
    this.loadElecciones();
    this.selectedIdCtrl.valueChanges.subscribe((id) => {
      if (id) {
        this.selectedId = id;
        this.loadConfiguracion(id);
      } else {
        this.selectedId = null;
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

  loadConfiguracion(id: string): void {
    this.loading = true;
    this._electionsService
      .getConfiguracion(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (config) => this.patchConfig(config),
        error: () => this._notify('No se pudo cargar la configuracion.'),
      });
  }

  save(): void {
    if (!this.selectedId) {
      this._notify('Selecciona una eleccion.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this._notify('Los colores deben tener formato hexadecimal, por ejemplo #1d4ed8.');
      return;
    }

    const payload = this.buildPayload();
    this.saving = true;
    this._electionsService
      .upsertConfiguracion(this.selectedId, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (config) => {
          this.patchConfig(config);
          this._notify('Configuracion guardada.');
        },
        error: (err) =>
          this._notify(this.errorMessage(err, 'No se pudo guardar.')),
      });
  }

  aplicarPaletaYavirac(): void {
    this.form.patchValue({
      colorPrimario: '#183f84',
      colorSecundario: '#ea580c',
      colorAcento: '#f3eadc',
    });
  }

  private patchConfig(config: ConfiguracionEleccion | null): void {
    this.form.reset({
      nombreInstitucion: config?.nombreInstitucion ?? '',
      logoUrl: config?.logoUrl ?? '',
      escudoUrl: config?.escudoUrl ?? '',
      colorPrimario: config?.colorPrimario ?? '#183f84',
      colorSecundario: config?.colorSecundario ?? '#ea580c',
      colorAcento: config?.colorAcento ?? '#f3eadc',
      mensajeBienvenida: config?.mensajeBienvenida ?? '',
    });
  }

  private buildPayload(): UpsertConfiguracionPayload {
    const raw = this.form.getRawValue();
    const payload: UpsertConfiguracionPayload = {};
    for (const field of CONFIG_FIELDS) {
      const value = (raw[field] ?? '').trim();
      payload[field] = value.length ? value : null;
    }
    return payload;
  }

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
