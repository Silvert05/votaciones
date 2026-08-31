import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  Candidatura,
  CalificarCandidaturaPayload,
} from '../../models/candidatura.model';

export interface CalificacionChecklistData {
  candidatura: Candidatura;
}

export type CalificacionChecklistResult = CalificarCandidaturaPayload;

@Component({
  selector: 'app-calificacion-checklist-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSlideToggleModule,
  ],
  templateUrl: './calificacion-checklist.dialog.html',
})
export class CalificacionChecklistDialog {
  readonly data = inject<CalificacionChecklistData>(MAT_DIALOG_DATA);
  private _fb = inject(FormBuilder);
  private _dialogRef = inject(MatDialogRef<CalificacionChecklistDialog>);

  form = this._fb.group({
    cumpleAprobadoCarrera: [
      this.data.candidatura.cumpleAprobadoCarrera ?? false,
    ],
    cumplePromedioAcademico: [
      this.data.candidatura.cumplePromedioAcademico ?? false,
    ],
    sancionado: [this.data.candidatura.sancionado ?? false],
    observacion: [this.data.candidatura.observacion ?? ''],
  });

  get cumpleAprobado(): boolean {
    return !!this.form.value.cumpleAprobadoCarrera;
  }

  get cumplePromedio(): boolean {
    return !!this.form.value.cumplePromedioAcademico;
  }

  get cumpleSancion(): boolean {
    return !this.form.value.sancionado;
  }

  get apto(): boolean {
    return this.cumpleAprobado && this.cumplePromedio && this.cumpleSancion;
  }

  save(): void {
    const raw = this.form.getRawValue();
    const result: CalificacionChecklistResult = {
      estado: this.apto ? 'CALIFICADA' : 'RECHAZADA',
      observacion: raw.observacion || null,
      sancionado: raw.sancionado ?? false,
      cumpleAprobadoCarrera: raw.cumpleAprobadoCarrera ?? false,
      cumplePromedioAcademico: raw.cumplePromedioAcademico ?? false,
    };
    this._dialogRef.close(result);
  }

  cancel(): void {
    this._dialogRef.close(null);
  }
}
