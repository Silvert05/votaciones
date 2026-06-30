import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@core/animations';
import { FuseAlertComponent, FuseAlertType } from '@core/components/alert';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatButtonModule, MatDividerModule, MatProgressSpinnerModule,
    MatCheckboxModule, FuseAlertComponent],
  templateUrl: './login.component.html',
  animations: fuseAnimations,
})
export default class LoginComponent implements OnInit {
  @ViewChild('loginNgForm') loginNgForm: NgForm;

  loginForm: FormGroup;
  showAlert: boolean = false;
  showPassword = false;
  alert: { type: FuseAlertType; message: string } = {
    type: 'success',
    message: '',
  };
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _activatedRoute = inject(ActivatedRoute);

  ngOnInit(): void {
    this.loginForm = this._formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', Validators.required],
    });
  }

  login(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loginForm.disable();
    this.showAlert = false;

    this._authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        // Cambio de contraseña forzado en el primer ingreso.
        if (res.changePassword && res.accessToken) {
          this._router.navigate(['/admin/auth/reset-password'], {
            queryParams: { token: res.accessToken },
          });
          return;
        }

        const redirectURL =
          this._activatedRoute.snapshot.queryParamMap.get('redirectURL') ||
          '/admin/dashboard';
        this._router.navigateByUrl(redirectURL);
      },
      error: (err) => {
        this.loginForm.enable();

        const errorMessage =
          err?.error?.message || err?.message || 'Error al iniciar sesión';

        this.alert = {
          type: 'error',
          message: Array.isArray(errorMessage)
            ? errorMessage.join(' ')
            : errorMessage,
        };
        this.showAlert = true;
      },
    });
  }
}
