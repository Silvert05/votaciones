import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { Opcion, TipoOpcion } from '../../models/security.model';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'admin-opciones-list',
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
  ],
  templateUrl: './opciones-list.component.html',
})
export default class OpcionesListComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _securityService = inject(SecurityService);
  private _snackBar = inject(MatSnackBar);

  readonly columns = ['titulo', 'codigo', 'ruta', 'padre', 'tipo', 'estado', 'acciones'];
  readonly tipos: TipoOpcion[] = ['GRUPO', 'PANTALLA'];

  opciones: Opcion[] = [];
  editing: Opcion | null = null;
  loading = false;
  saving = false;

  form = this._fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(120)]],
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    subtitulo: [''],
    ruta: [''],
    icono: [''],
    tipo: ['PANTALLA' as TipoOpcion, [Validators.required]],
    padreId: [null as string | null],
    orden: [0, [Validators.required]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this._securityService
      .listOpciones()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (opciones) => {
          this.opciones = opciones;
        },
        error: () => this._notify('No se pudieron cargar las opciones.'),
      });
  }

  edit(opcion: Opcion): void {
    this.editing = opcion;
    this.form.patchValue({
      codigo: opcion.codigo,
      titulo: opcion.titulo,
      subtitulo: opcion.subtitulo ?? '',
      ruta: opcion.ruta ?? '',
      icono: opcion.icono ?? '',
      tipo: opcion.tipo,
      padreId: opcion.padreId,
      orden: opcion.orden,
    });
  }

  cancelEdit(): void {
    this.editing = null;
    this.form.reset({
      codigo: '',
      titulo: '',
      subtitulo: '',
      ruta: '',
      icono: '',
      tipo: 'PANTALLA',
      padreId: null,
      orden: 0,
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      codigo: raw.codigo!,
      titulo: raw.titulo!,
      subtitulo: raw.subtitulo || null,
      ruta: raw.ruta || null,
      icono: raw.icono || null,
      tipo: raw.tipo!,
      padreId: raw.padreId || null,
      orden: Number(raw.orden ?? 0),
    };

    this.saving = true;
    const request$ = this.editing
      ? this._securityService.updateOpcion(this.editing.id, payload)
      : this._securityService.createOpcion(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this._notify(this.editing ? 'Opcion actualizada.' : 'Opcion creada.');
        this.cancelEdit();
        this.load();
      },
      error: (err) => this._notify(this._errorMessage(err, 'No se pudo guardar.')),
    });
  }

  toggle(opcion: Opcion): void {
    this._securityService.setOpcionActivo(opcion.id, !opcion.activo).subscribe({
      next: () => {
        this._notify(`Opcion ${opcion.activo ? 'desactivada' : 'activada'}.`);
        this.load();
      },
      error: (err) =>
        this._notify(this._errorMessage(err, 'No se pudo cambiar el estado.')),
    });
  }

  parentOptions(): Opcion[] {
    return this.opciones.filter((opcion) => opcion.id !== this.editing?.id);
  }

  private _notify(message: string): void {
    this._snackBar.open(message, 'Cerrar', { duration: 4000 });
  }

  private _errorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.message || fallback;
    return Array.isArray(message) ? message.join(' ') : message;
  }
}
