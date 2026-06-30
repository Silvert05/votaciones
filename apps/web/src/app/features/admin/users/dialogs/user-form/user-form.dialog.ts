import { Component, Inject, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FuseAlertComponent, FuseAlertType } from '@core/components/alert';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';

export interface UserFormData {
  mode: 'create' | 'edit';
  user?: User;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FuseAlertComponent,
  ],
  templateUrl: './user-form.dialog.html',
})
export class UserFormDialog implements OnInit {
  form: FormGroup;
  saving = false;
  showPassword = false;
  alert: { show: boolean; type: FuseAlertType; message: string } = {
    show: false,
    type: 'error',
    message: '',
  };

  private _fb = inject(FormBuilder);
  private _usersService = inject(UsersService);
  private _dialogRef = inject(MatDialogRef<UserFormDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: UserFormData) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit(): void {
    const u = this.data.user;
    this.form = this._fb.group({
      usuario: [
        { value: u?.usuario ?? '', disabled: this.isEdit },
        [Validators.required],
      ],
      nombre: [u?.nombre ?? '', [Validators.required]],
      email: [u?.email ?? '', [Validators.required, Validators.email]],
      rol: [u?.rol ?? 'USER', [Validators.required]],
      password: [
        '',
        this.isEdit ? [] : [Validators.required, Validators.minLength(6)],
      ],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.alert.show = false;
    const v = this.form.getRawValue();

    const request$ = this.isEdit
      ? this._usersService.update(this.data.user!.id, {
          nombre: v.nombre,
          email: v.email,
          rol: v.rol,
        })
      : this._usersService.create({
          usuario: v.usuario,
          nombre: v.nombre,
          email: v.email,
          password: v.password,
          rol: v.rol,
        });

    request$.subscribe({
      next: (user) => this._dialogRef.close(user),
      error: (err) => {
        this.saving = false;
        const message =
          err?.error?.message || err?.message || 'No se pudo guardar.';
        this.alert = {
          show: true,
          type: 'error',
          message: Array.isArray(message) ? message.join(' ') : message,
        };
      },
    });
  }

  cancel(): void {
    this._dialogRef.close();
  }
}
