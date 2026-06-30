import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { fuseAnimations } from '@core/animations';
import { FuseAlertComponent, FuseAlertType } from '@core/components/alert';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'admin-profile',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FuseAlertComponent,
  ],
  templateUrl: './profile.component.html',
  animations: fuseAnimations,
})
export default class ProfileComponent implements OnInit {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);

  readonly user = this._authService.user;

  profileForm: FormGroup;
  passwordForm: FormGroup;

  showCurrent = false;
  showNew = false;

  profileAlert: { show: boolean; type: FuseAlertType; message: string } = {
    show: false,
    type: 'success',
    message: '',
  };
  passwordAlert: { show: boolean; type: FuseAlertType; message: string } = {
    show: false,
    type: 'success',
    message: '',
  };

  ngOnInit(): void {
    const current = this.user();

    this.profileForm = this._formBuilder.group({
      usuario: [{ value: current?.usuario ?? '', disabled: true }],
      nombre: [current?.nombre ?? '', [Validators.required]],
      email: [current?.email ?? '', [Validators.required, Validators.email]],
    });

    this.passwordForm = this._formBuilder.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: ProfileComponent.matchPasswords },
    );

    // Refresca los datos del perfil desde el servidor.
    this._authService.profile().subscribe({
      next: (u) => {
        this.profileForm.patchValue({
          usuario: u.usuario,
          nombre: u.nombre,
          email: u.email,
        });
      },
      error: () => {
        /* el interceptor maneja el 401 */
      },
    });
  }

  static matchPasswords(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.profileForm.disable();
    this.profileAlert.show = false;

    const { nombre, email } = this.profileForm.getRawValue();
    this._authService.updateProfile({ nombre, email }).subscribe({
      next: () => {
        this.profileForm.enable();
        this.profileForm.get('usuario')?.disable();
        this._showAlert('profile', 'success', 'Perfil actualizado correctamente.');
      },
      error: (err) => {
        this.profileForm.enable();
        this.profileForm.get('usuario')?.disable();
        this._showAlert('profile', 'error', this._errorMessage(err));
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.passwordForm.disable();
    this.passwordAlert.show = false;

    const { currentPassword, newPassword } = this.passwordForm.value;
    this._authService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.passwordForm.enable();
        this.passwordForm.reset();
        this._showAlert('password', 'success', res.message);
      },
      error: (err) => {
        this.passwordForm.enable();
        this._showAlert('password', 'error', this._errorMessage(err));
      },
    });
  }

  private _errorMessage(err: any): string {
    const message =
      err?.error?.message || err?.message || 'Ocurrió un error inesperado.';
    return Array.isArray(message) ? message.join(' ') : message;
  }

  private _showAlert(
    target: 'profile' | 'password',
    type: FuseAlertType,
    message: string,
  ): void {
    const alert = target === 'profile' ? this.profileAlert : this.passwordAlert;
    alert.show = true;
    alert.type = type;
    alert.message = message;
  }
}
