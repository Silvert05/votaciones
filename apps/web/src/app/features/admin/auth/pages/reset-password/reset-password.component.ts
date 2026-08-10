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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fuseAnimations } from '@core/animations';
import { FuseAlertComponent, FuseAlertType } from '@core/components/alert';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FuseAlertComponent,
    RouterLink,
  ],
  templateUrl: './reset-password.component.html',
  animations: fuseAnimations,
})
export default class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  showAlert = false;
  showPassword = false;
  alert: { type: FuseAlertType; message: string } = {
    type: 'success',
    message: '',
  };

  private _token = '';
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _activatedRoute = inject(ActivatedRoute);

  ngOnInit(): void {
    this._token =
      this._activatedRoute.snapshot.queryParamMap.get('token') ?? '';

    if (!this._token) {
      this._router.navigate(['/admin/auth/login']);
      return;
    }

    this.form = this._formBuilder.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: ResetPasswordComponent.matchPasswords },
    );
  }

  static matchPasswords(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.form.disable();
    this.showAlert = false;

    this._authService
      .resetPassword(this.form.value.newPassword, this._token)
      .subscribe({
        next: () => {
          this._router.navigateByUrl(this._authService.homeUrl());
        },
        error: (err) => {
          this.form.enable();
          const message =
            err?.error?.message ||
            err?.message ||
            'No se pudo restablecer la contraseña.';
          this.alert = {
            type: 'error',
            message: Array.isArray(message) ? message.join(' ') : message,
          };
          this.showAlert = true;
        },
      });
  }
}
