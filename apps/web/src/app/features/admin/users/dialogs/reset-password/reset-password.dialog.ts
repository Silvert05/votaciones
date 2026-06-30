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
import { FuseAlertComponent, FuseAlertType } from '@core/components/alert';
import { User } from '../../models/user.model';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-reset-password-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FuseAlertComponent,
  ],
  templateUrl: './reset-password.dialog.html',
})
export class ResetPasswordDialog implements OnInit {
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
  private _dialogRef = inject(MatDialogRef<ResetPasswordDialog>);

  constructor(@Inject(MAT_DIALOG_DATA) public user: User) {}

  ngOnInit(): void {
    this.form = this._fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.alert.show = false;

    this._usersService
      .resetPassword(this.user.id, this.form.value.password)
      .subscribe({
        next: (user) => this._dialogRef.close(user),
        error: (err) => {
          this.saving = false;
          const message =
            err?.error?.message || err?.message || 'No se pudo resetear.';
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
